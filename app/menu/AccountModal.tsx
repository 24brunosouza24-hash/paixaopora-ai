"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

const PURPLE = "#7a1fb8";

export default function AccountModal({ open, onClose, onAuthed }: Props) {
  const [whats, setWhats] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<"whats" | "code">("whats");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setErr(null);
    setLoading(false);
    setDevCode(null);
    setCode("");
    setStep("whats");
  }, [open]);

  const disabled = useMemo(() => loading, [loading]);

  if (!open) return null;

  async function requestCode() {
    setErr(null);

    const cleanWhats = onlyDigits(whats);

    if (!cleanWhats || cleanWhats.length < 10) {
      setErr("Digite um número de WhatsApp válido.");
      return;
    }

    setLoading(true);

    try {
      const r = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: cleanWhats }),
      });

      const text = await r.text();
      const j = text ? JSON.parse(text) : {};

      if (!r.ok || !j.ok) {
        throw new Error(j?.error || "Erro ao enviar código.");
      }

      setDevCode(j.devCode || null);
      setStep("code");
    } catch (e: any) {
      setErr(e?.message || "Erro ao enviar código.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setErr(null);

    if (!code) {
      setErr("Digite o código recebido.");
      return;
    }

    setLoading(true);

    try {
      const r = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: onlyDigits(whats), code: onlyDigits(code) }),
      });

      const text = await r.text();
      const j = text ? JSON.parse(text) : {};

      if (!r.ok || !j.ok) {
        throw new Error(j?.error || "Código inválido.");
      }

      try {
        const raw = localStorage.getItem("acai_point_points_v1");
        const localPoints = raw ? Number(raw) : 0;

        const syncRes = await fetch("/api/points/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localPoints }),
        });

        const syncText = await syncRes.text();
        const syncJson = syncText ? JSON.parse(syncText) : {};

        if (syncJson?.ok) {
          localStorage.setItem("acai_point_points_v1", String(syncJson.points || 0));
          window.dispatchEvent(new Event("acai_points_updated"));
        }
      } catch {}

      onAuthed();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          background: "#fff",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: PURPLE }}>
            Sua conta
          </div>

          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Entre com seu WhatsApp para continuar o pedido.
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {step === "whats" && (
            <>
              <div style={{ color: "#666", fontSize: 13, lineHeight: 1.4, marginBottom: 14 }}>
                Se for sua primeira vez, não precisa criar cadastro agora.
                Depois do código, vamos pedir seus dados para finalizar o pedido.
              </div>

              <label style={{ fontSize: 12, fontWeight: 800, color: "#333" }}>
                WhatsApp
              </label>

              <input
                value={whats}
                onChange={(e) => setWhats(onlyDigits(e.target.value))}
                placeholder="DDD + número"
                inputMode="numeric"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 800,
                  fontSize: 16,
                  outline: "none",
                }}
              />

              {err && (
                <div style={{ marginTop: 12, color: "#b00020", fontSize: 13 }}>
                  {err}
                </div>
              )}

              <button
                disabled={disabled || !whats}
                onClick={requestCode}
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: 0,
                  background: PURPLE,
                  color: "#fff",
                  fontWeight: 900,
                  cursor: disabled || !whats ? "not-allowed" : "pointer",
                  opacity: disabled || !whats ? 0.65 : 1,
                }}
              >
                {loading ? "Enviando..." : "Entrar"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <div style={{ color: "#666", fontSize: 13, lineHeight: 1.4, marginBottom: 14 }}>
                Enviamos um código para o seu WhatsApp. Digite abaixo para continuar.
              </div>

              <label style={{ fontSize: 12, fontWeight: 800, color: "#333" }}>
                Código
              </label>

              <input
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value))}
                placeholder="Digite o código"
                inputMode="numeric"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 800,
                  fontSize: 16,
                  outline: "none",
                }}
              />

              {devCode && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                  <b>Modo teste:</b> seu código é <b>{devCode}</b>
                </div>
              )}

              {err && (
                <div style={{ marginTop: 12, color: "#b00020", fontSize: 13 }}>
                  {err}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  disabled={disabled}
                  onClick={() => {
                    setStep("whats");
                    setCode("");
                    setDevCode(null);
                    setErr(null);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${PURPLE}`,
                    background: "#fff",
                    color: PURPLE,
                    fontWeight: 900,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  Voltar
                </button>

                <button
                  disabled={disabled || !code}
                  onClick={verifyCode}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: 0,
                    background: PURPLE,
                    color: "#fff",
                    fontWeight: 900,
                    cursor: disabled || !code ? "not-allowed" : "pointer",
                    opacity: disabled || !code ? 0.65 : 1,
                  }}
                >
                  {loading ? "Entrando..." : "Confirmar código"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
