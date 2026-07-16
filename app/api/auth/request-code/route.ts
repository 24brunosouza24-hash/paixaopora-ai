import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { toE164BR } from "@/lib/phone";
import { sendWhatsAppOtp } from "@/lib/whatsappCloud";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hasWhatsAppCloudConfig() {
  const token = process.env.WHATSAPP_CLOUD_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "";

  return Boolean(
    token.trim() &&
      phoneNumberId.trim() &&
      templateName.trim() &&
      !token.includes("COLE_AQUI") &&
      !phoneNumberId.includes("COLE_AQUI")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.whatsapp || body?.phone || "");
    const phone = onlyDigits(phoneRaw);

    if (phone.length < 10 || phone.length > 13) {
      return NextResponse.json({ ok: false, error: "WhatsApp invalido" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, name: "" },
    });

    const code = randomCode6();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.userOtp.create({
      data: {
        phone,
        codeHash,
        expiresAt,
        userId: user.id,
      },
    });

    if (hasWhatsAppCloudConfig()) {
      await sendWhatsAppOtp({ toE164: toE164BR(phone), code });
      const isHelloWorld = process.env.WHATSAPP_OTP_TEMPLATE_NAME === "hello_world";
      return NextResponse.json({
        ok: true,
        phone,
        expiresAt,
        sentByWhatsApp: true,
        devCode: isHelloWorld ? code : undefined,
      });
    }

    // Modo teste: mostra o codigo enquanto a Meta/WhatsApp nao esta configurada.
    return NextResponse.json({ ok: true, phone, devCode: code, expiresAt, sentByWhatsApp: false });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro interno no request-code", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
