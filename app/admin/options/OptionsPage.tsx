"use client";

import { useEffect, useState } from "react";

type OptionItem = {
  id: string;
  type: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OptionsPage() {
  const [items, setItems] = useState<OptionItem[]>([]);
  const [type, setType] = useState("frutas");
  const [name, setName] = useState("");
  const [priceReais, setPriceReais] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string>("");

  async function load() {
    const r = await fetch("/api/admin/options", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      alert(d?.error || "Erro ao carregar extras");
      return;
    }
    setItems(d.items || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function add() {
    if (!name.trim()) return alert("Digite o nome do extra");

    setLoading(true);
    try {
      const r = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          priceReais: Number(priceReais || 0),
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        alert(d?.error || "Erro ao adicionar");
        return;
      }

      setName("");
      setPriceReais("0");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: string) {
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        alert(d?.error || "Erro ao desativar/ativar");
        return;
      }

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isActive: d.item.isActive } : x))
      );
    } finally {
      setBusyId("");
    }
  }

  async function remove(id: string, label: string) {
    const ok = confirm(`Excluir "${label}"?\n\nIsso apaga de vez.`);
    if (!ok) return;

    setBusyId(id);
    try {
      const r = await fetch("/api/admin/options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        alert(d?.error || "Erro ao excluir");
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusyId("");
    }
  }

  const grouped = items.reduce<Record<string, OptionItem[]>>((acc, it) => {
    const key = it.type || "outros";
    acc[key] ||= [];
    acc[key].push(it);
    return acc;
  }, {});

  return (
    <div style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Extras (cremes, frutas, toppings)</div>

      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="tipo (ex: cremes, frutas...)"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.2)",
            background: "transparent",
            color: "#fff",
          }}
        />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nome (ex: Leite Ninho)"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.2)",
            background: "transparent",
            color: "#fff",
          }}
        />

        <input
          value={priceReais}
          onChange={(e) => setPriceReais(e.target.value)}
          placeholder="preço em reais (ex: 2.50)"
          inputMode="decimal"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.2)",
            background: "transparent",
            color: "#fff",
          }}
        />

        <button
          onClick={add}
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "none",
            background: "#7a1fa2",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Adicionando..." : "Adicionar extra"}
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ opacity: 0.8 }}>Nenhum extra cadastrado ainda.</div>
      ) : (
        Object.entries(grouped).map(([t, list]) => (
          <div key={t} style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{t}</div>

            <div style={{ display: "grid", gap: 10 }}>
              {list.map((it) => (
                <div
                  key={it.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.15)",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    opacity: it.isActive ? 1 : 0.55,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{it.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {it.priceCents > 0 ? brl(it.priceCents) : "Grátis"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => toggle(it.id)}
                      disabled={busyId === it.id}
                      style={{
                        border: "1px solid rgba(255,255,255,.2)",
                        background: "transparent",
                        color: "#fff",
                        padding: "8px 10px",
                        borderRadius: 10,
                        fontWeight: 900,
                        cursor: "pointer",
                        opacity: busyId === it.id ? 0.6 : 1,
                      }}
                    >
                      {it.isActive ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      onClick={() => remove(it.id, it.name)}
                      disabled={busyId === it.id}
                      style={{
                        border: "1px solid rgba(255,255,255,.2)",
                        background: "rgba(255, 60, 60, .12)",
                        color: "#fff",
                        padding: "8px 10px",
                        borderRadius: 10,
                        fontWeight: 900,
                        cursor: "pointer",
                        opacity: busyId === it.id ? 0.6 : 1,
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
