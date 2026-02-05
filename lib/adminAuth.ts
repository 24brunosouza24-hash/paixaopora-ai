import jwt from "jsonwebtoken";

const COOKIE_NAME = "admin";

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function signAdminToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado no .env");

  return jwt.sign({ role: "admin" }, secret, { expiresIn: "30d" });
}

export function verifyAdminToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as any;
    if (payload?.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}
