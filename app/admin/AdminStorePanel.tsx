"use client";

import { useState } from "react";
import styles from "./admin.module.css";

type Props = {
  initialIsOpen: boolean;
  initialOpenHours: string;
  initialPromotionText: string;
};

export default function AdminStorePanel({ initialIsOpen, initialOpenHours, initialPromotionText }: Props) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [openHours, setOpenHours] = useState(initialOpenHours || "18h as 23h30");
  const [promotionText, setPromotionText] = useState(initialPromotionText || "");
  const [saving, setSaving] = useState(false);

  async function save(nextOpen = isOpen) {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/store/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: nextOpen, openHours, promotionText }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao salvar status da loja");
      setIsOpen(!!d.isOpen);
      setOpenHours(d.openHours || "18h as 23h30");
      setPromotionText(d.promotionText || "");
      window.dispatchEvent(new Event("acai_store_status_changed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    await save(next);
  }

  return (
    <div className={styles.softBox}>
      <div className={isOpen ? styles.badgeOpen : styles.badgeClosed}>
        <span className={styles.dot} />
        Loja {isOpen ? "aberta" : "fechada"}
      </div>

      <div className={styles.statusGrid}>
        <label>
          <div className={styles.helperText}>Horario de funcionamento</div>
          <input className={styles.input} value={openHours} onChange={(e) => setOpenHours(e.target.value)} placeholder="18h as 23h30" />
        </label>
        <label>
          <div className={styles.helperText}>Promocao no cardapio (opcional)</div>
          <input className={styles.input} value={promotionText} onChange={(e) => setPromotionText(e.target.value)} placeholder="Ex: Hoje tem promocao no copo de 500ml" />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} disabled={saving} className={isOpen ? styles.dangerButton : styles.successButton}>
          {isOpen ? "Fechar loja" : "Abrir loja"}
        </button>
        <button type="button" onClick={() => save()} disabled={saving} className={styles.ghostButton}>
          {saving ? "Salvando..." : "Salvar horario e promocao"}
        </button>
      </div>
    </div>
  );
}
