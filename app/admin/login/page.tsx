"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error ?? "Senha incorreta");
        return;
      }

      router.push("/admin");
    } catch {
      setMsg("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "Arial", maxWidth: 420 }}>
      <h1>🔐 Login do Admin</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="password"
          placeholder="Senha do painel"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            cursor: "pointer",
            background: "#6a1b9a",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg && <p style={{ color: "red" }}>{msg}</p>}
      </form>
    </main>
  );
}
