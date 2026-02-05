"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          password,
          addressLine,
          reference,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error ?? "Erro ao cadastrar.");
        return;
      }

      setMsg("Cadastro feito! Indo para login...");
      setTimeout(() => router.push("/login"), 700);
    } catch {
      setMsg("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "Arial", maxWidth: 400 }}>
      <h1>Cadastro</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Telefone com DDD (ex: 32998212071)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <input
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          placeholder="Endereço (Rua, número, bairro)"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          required
        />

        <input
          placeholder="Ponto de referência"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>

        {msg && <p>{msg}</p>}
      </form>

      <p style={{ marginTop: 10 }}>
        Já tem conta? <a href="/login">Entrar</a>
      </p>
    </main>
  );
}
