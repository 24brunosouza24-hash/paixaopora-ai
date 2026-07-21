"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";

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

const typeLabels: Record<string, string> = {
  adicionais: "Adicionais gratis",
  caldas: "Caldas",
  cremes: "Cremes",
  frutas: "Frutas",
  toppings: "Toppings",
  extras: "Extras pagos",
};

export default function OptionsPage() {
  const [items, setItems] = useState<OptionItem[]>([]);
  const [type, setType] = useState("adicionais");
  const [name, setName] = useState("");
  const [priceReais, setPriceReais] = useState("0,00");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function load() {
    const r = await fetch("/api/admin/options", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok) return alert(d?.error || "Erro ao carregar extras");
    setItems(d.items || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function add() {
    if (!name.trim()) return alert("Digite o nome do item");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim(), priceReais }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao adicionar");
      setName("");
      setPriceReais("0,00");
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
      if (!r.ok) return alert(d?.error || "Erro ao ativar/desativar");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isActive: d.item.isActive } : x)));
    } finally {
      setBusyId("");
    }
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Excluir "${label}"?

Isso apaga de vez.`)) return;
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao excluir");
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
    <div className={styles.formCard}>
      <h2 className={styles.sectionTitle}>Cremes, frutas, caldas e adicionais</h2>
      <div className={styles.formGrid}>
        <div className={styles.twoCols}>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="adicionais">Adicionais gratis</option>
            <option value="caldas">Caldas</option>
            <option value="cremes">Cremes</option>
            <option value="frutas">Frutas</option>
            <option value="toppings">Toppings</option>
            <option value="extras">Extras pagos</option>
          </select>
          <input className={styles.input} value={priceReais} onChange={(e) => setPriceReais(e.target.value)} placeholder="Preco. Ex: 3,50" inputMode="decimal" />
        </div>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome. Ex: Leite Ninho" />
        <button type="button" onClick={add} disabled={loading} className={styles.primaryButton}>
          {loading ? "Adicionando..." : "Adicionar item"}
        </button>
      </div>

      <div className={styles.optionGroups}>
        {Object.keys(grouped).length === 0 ? <p className={styles.helperText}>Nenhum item cadastrado ainda.</p> : null}
        {Object.entries(grouped).map(([t, list]) => (
          <div key={t}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 16 }}>{typeLabels[t] || t}</h3>
            {list.map((it) => (
              <div key={it.id} className={styles.optionItem} style={{ opacity: it.isActive ? 1 : .55 }}>
                <div>
                  <b>{it.name}</b>
                  <div className={styles.helperText}>{it.priceCents > 0 ? brl(it.priceCents) : "Gratis"}</div>
                </div>
                <div className={styles.rowActions}>
                  <button type="button" onClick={() => toggle(it.id)} disabled={busyId === it.id} className={styles.ghostButton}>
                    {it.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button type="button" onClick={() => remove(it.id, it.name)} disabled={busyId === it.id} className={styles.deleteButton}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
