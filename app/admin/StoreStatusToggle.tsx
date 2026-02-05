"use client";

import { useEffect, useState } from "react";

export default function StoreStatusToggle() {
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/store/status", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) setIsOpen(!!d.isOpen);
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !isOpen;
    setIsOpen(next);

    try {
      await fetch("/api/store/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: next }),
      });

      // evento pra atualizar Menu/Cart em tempo real
      window.dispatchEvent(new Event("acai_store_status_changed"));
    } catch {
      // se der erro, recarrega estado real
      load();
    }
  }

  useEffect(() => {
    load();

    const onChange = () => load();
    window.addEventListener("acai_store_status_changed", onChange as any);
    return () => window.removeEventListener("acai_store_status_changed", onChange as any);
  }, []);

  const label = isOpen ? "ABERTO" : "FECHADO";
  const color = isOpen ? "#1b8f3a" : "#b00020";
  const bg = isOpen ? "rgba(27,143,58,.12)" : "rgba(176,0,32,.12)";
  const border = isOpen ? "rgba(27,143,58,.35)" : "rgba(176,0,32,.35)";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "8px 12px",
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontWeight: 900,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        userSelect: "none",
      }}
      title="Clique para abrir/fechar a loja"
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      {loading ? "Carregando..." : `Loja: ${label}`}
    </button>
  );
}
