import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";
const SESSION_DAYS = 45;

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}
function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.whatsapp || body?.phone || "");
    const codeRaw = String(body?.code || "");
    const phone = onlyDigits(phoneRaw);
    const code = onlyDigits(codeRaw);

    if (phone.length < 10 || phone.length > 13) {
      return NextResponse.json({ ok: false, error: "WhatsApp inválido" }, { status: 400 });
    }
    if (code.length < 4) {
      return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 400 });
    }

    const otp = await prisma.userOtp.findFirst({
      where: {
        phone,
        codeHash: sha256(code),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    if (!otp?.user) {
      return NextResponse.json({ ok: false, error: "Código incorreto ou expirado" }, { status: 401 });
    }

    await prisma.userOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        tokenHash,
        userId: otp.user.id,
        expiresAt,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro interno no verify-code", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
