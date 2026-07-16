import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toE164BR } from "@/lib/phone";
import { generateOtpCode, hashOtp } from "@/lib/otp";
import { sendWhatsAppOtp } from "@/lib/whatsappCloud";

function minutesFromNow(min: number) {
  return new Date(Date.now() + min * 60 * 1000);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneInput = String(body?.phone || "");

    const phoneE164 = toE164BR(phoneInput);

    const ttl = Number(process.env.OTP_TTL_MINUTES || "5");
    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || "5");

    if (!Number.isFinite(ttl) || ttl < 1 || ttl > 30) {
      return NextResponse.json({ ok: false, error: "Config OTP_TTL_MINUTES inválida." }, { status: 500 });
    }
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      return NextResponse.json({ ok: false, error: "Config OTP_MAX_ATTEMPTS inválida." }, { status: 500 });
    }

    // Gera e salva OTP (hash)
    const code = generateOtpCode();
    const { salt, hash } = hashOtp(code);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      null;

    const userAgent = req.headers.get("user-agent") || null;

    // (Opcional) invalidar tokens anteriores não consumidos ainda válidos
    await prisma.otpToken.updateMany({
      where: {
        phoneE164,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        consumedAt: new Date(), // “mata” os anteriores
      },
    });

    const token = await prisma.otpToken.create({
      data: {
        phoneE164,
        codeHash: hash,
        salt,
        attempts: 0,
        expiresAt: minutesFromNow(ttl),
        ip,
        userAgent,
      },
      select: { id: true, expiresAt: true },
    });

    // Envia WhatsApp
    await sendWhatsAppOtp({ toE164: phoneE164, code });

    return NextResponse.json({
      ok: true,
      otpTokenId: token.id,
      expiresAt: token.expiresAt.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro inesperado ao solicitar OTP." },
      { status: 400 }
    );
  }
}
