"use client";

import { useMemo, useState } from "react";
import styles from "../admin.module.css";

type Variant = { id: string; label: string; priceCents: number; sortOrder: number };
type Choice = { id: string; name: string; sortOrder: number };

type Product = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  categoryTitle?: string | null;
  kind: string;
  basePriceCents: number;
  variants: Variant[];
  choices?: Choice[];
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function centsToReais(cents: number) {
  return (Number(cents || 0) / 100).toFixed(2).replace(".", ",");
}

function toNumber(v: string) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function splitItems(text: string) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function variantsToText(variants: Variant[]) {
  return (variants || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((v) => `${v.label}=${centsToReais(v.priceCents)}`)
    .join("\n");
}

function parseVariants(text: string) {
  return text
    .split(/\n+/)
    .map((line, idx) => {
      const clean = line.trim();
      if (!clean) return null;
      const parts = clean.split(/[=:-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      return { label: parts[0], priceReais: toNumber(parts.slice(1).join(".")), sortOrder: idx };
    })
    .filter(Boolean);
}

function productPriceLabel(p: Product) {
  if (String(p.kind).toUpperCase() === "SIMPLE") return brl(p.basePriceCents || 0);
  const first = [...(p.variants || [])].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return first ? brl(first.priceCents) : "Sem preco";
}


async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem valida.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Essa foto esta muito grande. Escolha uma imagem de ate 8 MB.");
  }

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

const categoryOptions = [
  ["acai", "Acai"],
  ["sorvete", "Sorvete"],
  ["copo da felicidade", "Copo da Felicidade"],
  ["pudim", "Pudim"],
  ["doces", "Doces"],
  ["cookies", "Cookies"],
  ["promocoes", "Promocoes"],
  ["outros", "Outros"],
];

export default function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingId, setLoadingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [kind, setKind] = useState<"ACAI" | "COPO" | "SIMPLE">("ACAI");
  const [category, setCategory] = useState("acai");
  const [categoryTitle, setCategoryTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [basePrice, setBasePrice] = useState("10,00");
  const [variantLines, setVariantLines] = useState("300ml=12,00\n500ml=16,00");
  const [flavorsText, setFlavorsText] = useState("");

  const list = useMemo(() => products.slice(), [products]);
  const activeCount = useMemo(() => products.filter((p) => p.isActive).length, [products]);

  function resetForm() {
    setEditingId(null);
    setKind("ACAI");
    setCategory("acai");
    setCategoryTitle("");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setBasePrice("10,00");
    setVariantLines("300ml=12,00\n500ml=16,00");
    setFlavorsText("");
  }

  function startEdit(p: Product) {
    const nextKind = String(p.kind || "ACAI").toUpperCase() === "SIMPLE" ? "SIMPLE" : String(p.kind || "ACAI").toUpperCase() === "COPO" ? "COPO" : "ACAI";
    setEditingId(p.id);
    setKind(nextKind);
    setCategory(p.category || "outros");
    setCategoryTitle(p.categoryTitle || "");
    setTitle(p.title || "");
    setDescription(p.description || "");
    setImageUrl(p.imageUrl || "");
    setBasePrice(centsToReais(p.basePriceCents || 0));
    setVariantLines(p.variants?.length ? variantsToText(p.variants) : "300ml=12,00\n500ml=16,00");
    setFlavorsText((p.choices || []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name).join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      setImageUrl(await imageFileToDataUrl(file));
    } catch (error: any) {
      alert(error?.message || "Erro ao preparar foto");
    } finally {
      setUploading(false);
    }
  }

  async function toggleProduct(p: Product) {
    setLoadingId(p.id);
    try {
      const r = await fetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao ativar/desativar");
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: d.product.isActive } : x)));
    } finally {
      setLoadingId("");
    }
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Excluir "${p.title}"?

Isso apaga de vez.`)) return;
    setLoadingId(p.id);
    try {
      const r = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao excluir");
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } finally {
      setLoadingId("");
    }
  }

  async function saveProduct() {
    if (!title.trim()) return alert("Digite o nome do produto");

    const normalizedKind = kind;
    const payload: any = {
      kind: normalizedKind,
      category: category.trim().toLowerCase(),
      categoryTitle: category.trim().toLowerCase() === "outros" ? categoryTitle.trim() || title.trim() : null,
      title: title.trim(),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      isActive: true,
      choices: splitItems(flavorsText),
    };

    if (normalizedKind === "SIMPLE") {
      payload.basePriceReais = toNumber(basePrice);
    } else {
      const variants = parseVariants(variantLines);
      if (variants.length === 0) return alert("Informe pelo menos um tamanho/preco. Ex: 300ml=12,00");
      payload.variants = variants;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const r = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao salvar produto");
      setProducts((prev) => editingId ? prev.map((p) => (p.id === editingId ? d.product : p)) : [d.product, ...prev]);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{products.length}</div>
          <div className={styles.statLabel}>Produtos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{activeCount}</div>
          <div className={styles.statLabel}>Ativos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{products.length - activeCount}</div>
          <div className={styles.statLabel}>Desativados</div>
        </div>
      </div>

      <div className={styles.formCard}>
        <h2 className={styles.sectionTitle}>{editingId ? "Editar produto" : "Adicionar produto"}</h2>
        <div className={styles.formGrid}>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do produto (legenda)" />

          <div className={styles.twoCols}>
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={styles.select} value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="ACAI">Com tamanhos e adicionais</option>
              <option value="COPO">Copo com tamanhos e sabores</option>
              <option value="SIMPLE">Produto simples / preco unico</option>
            </select>
          </div>

          {category === "outros" ? (
            <input className={styles.input} value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)} placeholder="Nome da secao no cardapio (ex: Bolo de Sal)" />
          ) : null}

          {kind === "SIMPLE" ? (
            <input className={styles.input} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Preco" inputMode="decimal" />
          ) : (
            <label>
              <div className={styles.helperText}>Tamanhos e precos, um por linha. Ex: 300ml=12,00</div>
              <textarea className={styles.textarea} value={variantLines} onChange={(e) => setVariantLines(e.target.value)} />
            </label>
          )}

          <div className={styles.uploadBox}>
            <span className={styles.uploadLabel}>Foto do produto</span>
            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); }} />
            {uploading ? <p className={styles.helperText}>Preparando foto...</p> : null}
            {imageUrl ? (
              <div className={styles.previewRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.previewImage} src={imageUrl} alt="Previa" />
                <span className={styles.helperText}>Foto pronta para salvar.</span>
              </div>
            ) : null}
          </div>

          <label>
            <b>Sabores / recheios</b>
            <p className={styles.helperText}>Separe cada sabor por virgula ou coloque um por linha.</p>
            <textarea className={styles.textarea} value={flavorsText} onChange={(e) => setFlavorsText(e.target.value)} placeholder="Ex.: Morango, Coco, Brigadeiro" />
          </label>

          <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descricao" />

          <button type="button" onClick={saveProduct} disabled={saving || uploading} className={styles.primaryButton}>
            {saving ? "Salvando..." : editingId ? "Salvar edicao" : "Salvar produto"}
          </button>
          {editingId ? <button type="button" onClick={resetForm} className={styles.ghostButton}>Cancelar edicao</button> : null}
        </div>
      </div>

      <div className={styles.productList}>
        {list.length === 0 ? <p className={styles.helperText}>Nenhum produto cadastrado ainda.</p> : null}
        {list.map((p) => (
          <div key={p.id} className={`${styles.productRow} ${!p.isActive ? styles.productRowInactive : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl ? <img className={styles.productThumb} src={p.imageUrl} alt={p.title} /> : <div className={styles.productThumb} />}
            <div>
              <div className={styles.productName}>{p.title}</div>
              <div className={styles.productMeta}>{p.categoryTitle || p.category} - {productPriceLabel(p)} {p.isActive ? "" : "- inativo"}</div>
            </div>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => toggleProduct(p)} disabled={loadingId === p.id} className={styles.ghostButton}>
                {loadingId === p.id ? "..." : p.isActive ? "Desativar" : "Ativar"}
              </button>
              <button type="button" onClick={() => startEdit(p)} className={styles.ghostButton}>Editar</button>
              <button type="button" onClick={() => deleteProduct(p)} disabled={loadingId === p.id} className={styles.deleteButton}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
