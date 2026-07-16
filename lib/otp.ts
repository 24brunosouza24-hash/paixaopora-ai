import crypto from "crypto";

export function generateOtpCode(): string {
  // 6 dígitos, com criptografia
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function hashOtp(code: string, salt?: string): { salt: string; hash: string } {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  // scrypt é bem adequado aqui
  const derived = crypto.scryptSync(code, s, 32);
  return { salt: s, hash: derived.toString("hex") };
}

export function verifyOtp(code: string, salt: string, expectedHashHex: string): boolean {
  const derived = crypto.scryptSync(code, salt, 32).toString("hex");

  // timingSafeEqual exige buffers do mesmo tamanho
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(expectedHashHex, "hex");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}
