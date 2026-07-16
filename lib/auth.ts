import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";
const SESSION_DAYS = 45;

export function normalizeWhatsapp(v: string) {
  return (v || "").replace(/\D/g, "");
}

export function isValidWhatsappBR(v: string) {
  const n = normalizeWhatsapp(v);
  return n.length >= 10 && n.length <= 13;
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtp(whatsappRaw: string) {
  const whatsapp = normalizeWhatsapp(whatsappRaw);
  const code = randomCode6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = await prisma.user.upsert({
    where: { phone: whatsapp },
    update: {},
    create: { phone: whatsapp },
  });

  await prisma.userOtp.create({
    data: { phone: whatsapp, codeHash, expiresAt, userId: user.id },
  });

  return { whatsapp, code, expiresAt };
}

export async function verifyOtp(whatsappRaw: string, codeRaw: string) {
  const whatsapp = normalizeWhatsapp(whatsappRaw);
  const codeHash = sha256((codeRaw || "").trim());

  const otp = await prisma.userOtp.findFirst({
    where: {
      phone: whatsapp,
      codeHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false as const };

  await prisma.userOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { phone: whatsapp },
    update: {},
    create: { phone: whatsapp },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { ok: true as const, userId: user.id };
}

export async function getSessionCustomer() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256(token);

  const session = await prisma.userSession.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  return session?.user ?? null;
}

export async function logoutSession() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = sha256(token);
    await prisma.userSession.deleteMany({ where: { tokenHash } });
  }
  c.set(COOKIE_NAME, "", { path: "/", expires: new Date(0) });
}
