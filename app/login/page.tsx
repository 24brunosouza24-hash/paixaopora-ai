"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error ?? "Telefone ou senha inválidos.");
        return;
      }

      setMsg("Login feito! Indo para o cardápio...");
      setTimeout(() => router.push("/"), 700);
    } catch {
      setMsg("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "Arial", maxWidth: 400 }}>
      <h1>Entrar</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
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

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg && <p>{msg}</p>}
      </form>

      <p style={{ marginTop: 10 }}>
        Não tem conta? <a href="/register">Criar cadastro</a>
      </p>
    </main>
  );
}
