"use client";

import { useState } from "react";
import styles from "./admin.module.css";

type Props = {
  initialIsOpen: boolean;
  initialOpenHours: string;
  initialPromotionText: string;
  initialPromotionImageUrl: string;
};

export default function AdminStorePanel({ initialIsOpen, initialOpenHours, initialPromotionText, initialPromotionImageUrl }: Props) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [openHours, setOpenHours] = useState(initialOpenHours || "18h as 23h30");
  const [promotionText, setPromotionText] = useState(initialPromotionText || "");
  const [promotionImageUrl, setPromotionImageUrl] = useState(initialPromotionImageUrl || "");
  const [preparingImage, setPreparingImage] = useState(false);
  const [saving, setSaving] = useState(false);


  async function imageFileToDataUrl(file: File) {
    if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem valida.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Essa foto esta muito grande. Escolha uma imagem de ate 8 MB.");

    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nao consegui ler essa foto."));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Nao consegui preparar essa foto."));
      image.src = source;
    });

    const maxSize = 1200;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Nao consegui preparar essa foto.");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function uploadPromotionImage(file: File) {
    setPreparingImage(true);
    try {
      setPromotionImageUrl(await imageFileToDataUrl(file));
    } catch (error: any) {
      alert(error?.message || "Erro ao preparar foto");
    } finally {
      setPreparingImage(false);
    }
  }

  async function save(nextOpen = isOpen) {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/store/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: nextOpen, openHours, promotionText, promotionImageUrl }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao salvar status da loja");
      setIsOpen(!!d.isOpen);
      setOpenHours(d.openHours || "18h as 23h30");
      setPromotionText(d.promotionText || "");
      setPromotionImageUrl(d.promotionImageUrl || "");
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
          <div className={styles.helperText}>Descricao da promocao (opcional)</div>
          <input className={styles.input} value={promotionText} onChange={(e) => setPromotionText(e.target.value)} placeholder="Ex: Na compra de 2 copos de 500ml, ganhe 1 de 300ml" />
        </label>
        <div className={styles.uploadBox}>
          <span className={styles.uploadLabel}>Foto da promocao (opcional)</span>
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPromotionImage(file); }} />
          {preparingImage ? <p className={styles.helperText}>Preparando foto...</p> : null}
          {promotionImageUrl ? (
            <div className={styles.previewRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.previewImage} src={promotionImageUrl} alt="Previa da promocao" />
              <button type="button" onClick={() => setPromotionImageUrl("")} className={styles.ghostButton}>Remover foto</button>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} disabled={saving || preparingImage} className={isOpen ? styles.dangerButton : styles.successButton}>
          {isOpen ? "Fechar loja" : "Abrir loja"}
        </button>
        <button type="button" onClick={() => save()} disabled={saving || preparingImage} className={styles.ghostButton}>
          {saving ? "Salvando..." : "Salvar horario e promocao"}
        </button>
      </div>
    </div>
  );
}
