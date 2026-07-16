import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toE164BR } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import crypto from "crypto";

function requireIntEnv(name: string, fallback: number) {
  const raw = (process.env[name] || "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken() {
  // 32 bytes -> 64 hex chars
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneInput = String(body?.phone || "");
    const code = String(body?.code || "").trim();
    const otpTokenId = String(body?.otpTokenId || "").trim();

    if (!code || code.length < 4 || code.length > 8) {
      return NextResponse.json(
        { ok: false, error: "Código inválido." },
        { status: 400 }
      );
    }

    const phoneE164 = toE164BR(phoneInput);

    const maxAttempts = requireIntEnv("OTP_MAX_ATTEMPTS", 5);

    const token = await prisma.otpToken.findFirst({
      where: {
        id: otpTokenId || undefined,
        phoneE164,
      },
    });

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "OTP não encontrado." },
        { status: 404 }
      );
    }

    if (token.consumedAt) {
      return NextResponse.json(
        { ok: false, error: "Este OTP já foi usado." },
        { status: 400 }
      );
    }

    if (token.expiresAt <= new Date()) {
      return NextResponse.json(
        { ok: false, error: "OTP expirado." },
        { status: 400 }
      );
    }

    if (token.attempts >= maxAttempts) {
      return NextResponse.json(
        { ok: false, error: "Limite de tentativas excedido." },
        { status: 429 }
      );
    }

    const ok = verifyOtp(code, token.salt, token.codeHash);

    if (!ok) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { ok: false, error: "Código incorreto." },
        { status: 400 }
      );
    }

    // ✅ Consome o token (não pode reutilizar)
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });

    // ✅ Acha ou cria o usuário pelo telefone (padronizado E.164)
    const user =
      (await prisma.user.findUnique({ where: { phone: phoneE164 } })) ??
      (await prisma.user.create({
        data: { phone: phoneE164 },
      }));

    // ✅ Cria sessão
    const sessionTtlDays = requireIntEnv("SESSION_TTL_DAYS", 30);
    const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);

    const sessionToken = randomToken(); // vai pro cookie
    const tokenHash = sha256Hex(sessionToken); // vai pro banco

    await prisma.userSession.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // (Opcional, mas recomendado): limpar sessões expiradas desse usuário
    await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lte: new Date() },
      },
    });

    // ✅ Seta cookie httpOnly
    const cookieName = (process.env.SESSION_COOKIE_NAME || "acai_point_session").trim();
    const isProd = process.env.NODE_ENV === "production";

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: cookieName,
      value: sessionToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro inesperado ao verificar OTP." },
      { status: 400 }
    );
  }
}
