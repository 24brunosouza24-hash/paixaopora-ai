export function toE164BR(input: string): string {
  const raw = (input || "").trim();

  // remove tudo que não é dígito
  let digits = raw.replace(/\D/g, "");

  // Se veio com 00 (ex: 0055...), remove 00
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Se já começou com 55, ok
  if (digits.startsWith("55")) {
    // valida tamanho típico BR: 55 + DDD(2) + número(8/9)
    if (digits.length < 12 || digits.length > 13) {
      throw new Error("Telefone inválido (tamanho BR inesperado).");
    }
    return `+${digits}`;
  }

  // Se veio sem 55, assume BR
  // Ex: DDD + 9 dígitos (11) = 13 com 55, ou DDD + 8 dígitos (10) = 12 com 55
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  throw new Error("Telefone inválido. Envie com DDD (ex: 31999999999).");
}
