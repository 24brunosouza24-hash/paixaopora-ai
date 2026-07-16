"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ReqOtpResp =
  | { ok: true; otpTokenId: string; expiresAt: string }
  | { ok: false; error?: string };

type VerifyOtpResp = { ok: true } | { ok: false; error?: string };

function maskPhoneHint(v: string) {
  const d = (v || "").replace(/\D/g, "");
  if (!d) return "";
  // só um “hint” visual; não altera o valor real
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();

  // opcional: se você quiser voltar pra uma página específica após login
  const nextUrl = useMemo(() => params.get("next") || "/", [params]);

  const [step, setStep] = useState<"phone" | "code">("phone");

  const [phone, setPhone] = useState("");
  const phoneHint = useMemo(() => maskPhoneHint(phone), [phone]);

  const [otpTokenId, setOtpTokenId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestOtp() {
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/whatsapp/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data: ReqOtpResp = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !data?.ok) {
        setMsg((data as any)?.error ?? "Não foi possível enviar o código. Verifique o telefone.");
        return;
      }

      setOtpTokenId(data.otpTokenId);
      setExpiresAt(data.expiresAt);
      setStep("code");
      setMsg("Código enviado no WhatsApp. Digite o código para entrar.");
    } catch {
      setMsg("Erro de conexão ao enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/whatsapp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, otpTokenId }),
      });

      const data: VerifyOtpResp = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !data?.ok) {
        setMsg((data as any)?.error ?? "Código inválido ou expirado.");
        return;
      }

      setMsg("Login confirmado! Indo para o cardápio...");
      // se seu backend seta cookie de sessão aqui, basta redirecionar
      setTimeout(() => router.push(nextUrl), 400);
    } catch {
      setMsg("Erro de conexão ao validar o código.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("phone");
    setOtpTokenId("");
    setExpiresAt("");
    setCode("");
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (step === "phone") {
      await requestOtp();
    } else {
      await verifyOtp();
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "Arial", maxWidth: 420 }}>
      <h1>Entrar</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Seu WhatsApp</span>
          <input
            placeholder="Telefone com DDD (ex: 32998212071)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
            disabled={loading || step === "code"}
          />
          {phoneHint && (
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Formato: {phoneHint}
            </span>
          )}
        </label>

        {step === "code" && (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, opacity: 0.8 }}>Código</span>
              <input
                placeholder="Digite o código (6 dígitos)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={loading}
              />
            </label>

            {expiresAt && (
              <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                Expira em: {new Date(expiresAt).toLocaleString("pt-BR")}
              </p>
            )}
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading
            ? step === "phone"
              ? "Enviando..."
              : "Validando..."
            : step === "phone"
              ? "Enviar código"
              : "Confirmar código"}
        </button>

        {step === "code" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              style={{ padding: "8px 10px" }}
            >
              Reenviar código
            </button>

            <button
              type="button"
              onClick={reset}
              disabled={loading}
              style={{ padding: "8px 10px" }}
            >
              Trocar telefone
            </button>
          </div>
        )}

        {msg && <p style={{ margin: 0 }}>{msg}</p>}
      </form>

      <p style={{ marginTop: 14, fontSize: 13, opacity: 0.85 }}>
        Ao entrar, você concorda em receber um código de verificação no WhatsApp.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
