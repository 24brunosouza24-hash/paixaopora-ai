"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantDraft = { label: string; price: string };

export default function NewProductPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("acai");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [variants, setVariants] = useState<VariantDraft[]>([
    { label: "300ml", price: "13,99" },
    { label: "500ml", price: "18,99" },
  ]);

  const [loading, setLoading] = useState(false);

  function parseBRLToCents(value: string) {
    // aceita "18,99" ou "18.99"
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function updateVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { label: "", price: "" }]);
  }

  function removeVariant(i: number) {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!title.trim()) return alert("Preencha o título");
    if (!category.trim()) return alert("Preencha a categoria");
    if (variants.length === 0) return alert("Adicione ao menos 1 variante");

    const payloadVariants = variants.map((v, idx) => {
      const priceCents = parseBRLToCents(v.price);
      if (!v.label.trim()) throw new Error("Variante sem nome (label)");
      if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error("Preço inválido em uma variante");
      return { label: v.label.trim(), priceCents, sortOrder: idx };
    });

    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          description,
          imageUrl,
          isActive,
          variants: payloadVariants,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar produto");

      alert("Produto criado!");
      router.push("/admin");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Novo produto</h1>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div>Título</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          <div>Categoria</div>
          <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: 10 }} />
          <div style={{ fontSize: 12, opacity: 0.7 }}>Ex: acai, doces, pudim, copo</div>
        </label>

        <label>
          <div>Descrição</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: 10, minHeight: 80 }} />
        </label>

        <label>
          <div>Imagem (URL)</div>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Ativo no cardápio
        </label>

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Variantes / tamanhos</div>

          {variants.map((v, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 8, marginBottom: 8 }}>
              <input
                placeholder="Ex: 300ml"
                value={v.label}
                onChange={(e) => updateVariant(i, { label: e.target.value })}
                style={{ padding: 10 }}
              />
              <input
                placeholder="Ex: 18,99"
                value={v.price}
                onChange={(e) => updateVariant(i, { price: e.target.value })}
                style={{ padding: 10 }}
              />
              <button onClick={() => removeVariant(i)} style={{ border: "1px solid #444", borderRadius: 8 }}>
                Remover
              </button>
            </div>
          ))}

          <button onClick={addVariant} style={{ padding: "10px 12px", border: "1px solid #444", borderRadius: 8 }}>
            + Adicionar variante
          </button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={loading}
            onClick={submit}
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #444", cursor: "pointer" }}
          >
            {loading ? "Salvando..." : "Salvar produto"}
          </button>

          <button
            onClick={() => router.push("/admin")}
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #444", cursor: "pointer" }}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
