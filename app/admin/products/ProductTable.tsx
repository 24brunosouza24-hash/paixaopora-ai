"use client";

import { useMemo, useState } from "react";

type Variant = { id: string; label: string; priceCents: number; sortOrder: number };
type Choice = { id: string; name: string; sortOrder: number };

type Product = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  kind: string; // ACAI | COPO | SIMPLE
  basePriceCents: number;
  variants: Variant[];
  choices?: Choice[];
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumber(v: string) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingId, setLoadingId] = useState<string>("");

  // modal novo produto
  const [open, setOpen] = useState(false);

  const [kind, setKind] = useState<"ACAI" | "COPO" | "SIMPLE">("ACAI");
  const [category, setCategory] = useState("acai");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // ACAI
  const [p300, setP300] = useState("12.00");
  const [p500, setP500] = useState("16.00");

  // COPO
  const [p150, setP150] = useState("15.00");
  const [p300copo, setP300copo] = useState("20.00");
  const [flavors, setFlavors] = useState("Morango, Coco, Brigadeiro");

  // SIMPLE
  const [basePrice, setBasePrice] = useState("10.00");

  const [saving, setSaving] = useState(false);

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

      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isActive: d.product.isActive } : x))
      );
    } finally {
      setLoadingId("");
    }
  }

  async function deleteProduct(p: Product) {
    const ok = confirm(`Excluir "${p.title}"?\n\nIsso apaga de vez.`);
    if (!ok) return;

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

  function resetFormAfterCreate() {
    setTitle("");
    setDescription("");
    setImageUrl("");

    // reset preços
    setP300("12.00");
    setP500("16.00");
    setP150("15.00");
    setP300copo("20.00");
    setFlavors("Morango, Coco, Brigadeiro");
    setBasePrice("10.00");
  }

  async function createProduct() {
    if (!title.trim()) return alert("Digite o nome do produto");

    setSaving(true);
    try {
      const payload: any = {
        kind,
        category: category.trim().toLowerCase(),
        title: title.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        isActive: true,
      };

      if (kind === "SIMPLE") {
        payload.basePriceReais = toNumber(basePrice);
      } else if (kind === "COPO") {
        payload.variants = [
          { label: "150ml", priceReais: toNumber(p150), sortOrder: 0 },
          { label: "300ml", priceReais: toNumber(p300copo), sortOrder: 1 },
        ];

        payload.choices = flavors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        // ACAI
        payload.variants = [
          { label: "300ml", priceReais: toNumber(p300), sortOrder: 0 },
          { label: "500ml", priceReais: toNumber(p500), sortOrder: 1 },
        ];
      }

      // ✅ rota correta
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) return alert(d?.error || "Erro ao criar");

      setProducts((prev) => [d.product, ...prev]);
      setOpen(false);
      resetFormAfterCreate();
    } finally {
      setSaving(false);
    }
  }

  const list = useMemo(() => products.slice(), [products]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Produtos ({list.length})</div>

        <button
          onClick={() => setOpen(true)}
          style={{
            border: "1px solid rgba(255,255,255,.2)",
            background: "transparent",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          + Novo produto
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Nenhum produto cadastrado ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                opacity: p.isActive ? 1 : 0.55,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>
                  {p.title}{" "}
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    ({p.category}) • {p.kind}
                  </span>
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                  {p.kind === "SIMPLE" ? (
                    <span
                      style={{
                        border: "1px solid rgba(255,255,255,.18)",
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontWeight: 800,
                      }}
                    >
                      Preço: {brl(p.basePriceCents || 0)}
                    </span>
                  ) : p.variants?.length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {p.variants
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((v) => (
                          <span
                            key={v.id}
                            style={{
                              border: "1px solid rgba(255,255,255,.18)",
                              padding: "4px 8px",
                              borderRadius: 999,
                              fontWeight: 800,
                            }}
                          >
                            {v.label}: {brl(v.priceCents)}
                          </span>
                        ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </div>

                {p.kind === "COPO" && (p.choices?.length || 0) > 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                    Sabores:{" "}
                    {(p.choices || [])
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((c) => c.name)
                      .join(", ")}
                  </div>
                ) : null}

                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                  Status:{" "}
                  <b style={{ color: p.isActive ? "#9fef00" : "#ff5c5c" }}>
                    {p.isActive ? "ATIVO" : "INATIVO"}
                  </b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => toggleProduct(p)}
                  disabled={loadingId === p.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "transparent",
                    color: "#fff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: loadingId === p.id ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {loadingId === p.id ? "..." : p.isActive ? "Desativar" : "Ativar"}
                </button>

                <button
                  onClick={() => deleteProduct(p)}
                  disabled={loadingId === p.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(255, 60, 60, .12)",
                    color: "#fff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: loadingId === p.id ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVO PRODUTO */}
      {open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 560,
              maxWidth: "95vw",
              background: "#111",
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 16,
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>Novo produto</div>

            <div style={{ display: "grid", gap: 10 }}>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                <option value="ACAI">ACAI (com adicionais/caldas/extras)</option>
                <option value="COPO">COPO (150/300 + sabores)</option>
                <option value="SIMPLE">SIMPLE (pudim/doces)</option>
              </select>

              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="categoria (acai, copo, pudim, doces)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  color: "#fff",
                }}
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="nome do produto"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  color: "#fff",
                }}
              />

              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="descrição (opcional)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  color: "#fff",
                }}
              />

              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="url da imagem (opcional)"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  color: "#fff",
                }}
              />

              {kind === "ACAI" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    value={p300}
                    onChange={(e) => setP300(e.target.value)}
                    placeholder="Preço 300ml (ex 12.00)"
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.2)",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                  <input
                    value={p500}
                    onChange={(e) => setP500(e.target.value)}
                    placeholder="Preço 500ml (ex 16.00)"
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.2)",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                </div>
              ) : null}

              {kind === "COPO" ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input
                      value={p150}
                      onChange={(e) => setP150(e.target.value)}
                      placeholder="Preço 150ml (ex 15.00)"
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,.2)",
                        background: "transparent",
                        color: "#fff",
                      }}
                    />
                    <input
                      value={p300copo}
                      onChange={(e) => setP300copo(e.target.value)}
                      placeholder="Preço 300ml (ex 20.00)"
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,.2)",
                        background: "transparent",
                        color: "#fff",
                      }}
                    />
                  </div>

                  <input
                    value={flavors}
                    onChange={(e) => setFlavors(e.target.value)}
                    placeholder="Sabores (separe por vírgula) Ex: Morango, Coco, Brigadeiro"
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.2)",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                </>
              ) : null}

              {kind === "SIMPLE" ? (
                <input
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Preço (ex 10.00)"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "transparent",
                    color: "#fff",
                  }}
                />
              ) : null}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "transparent",
                    color: "#fff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontWeight: 900,
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={createProduct}
                  disabled={saving}
                  style={{
                    border: "none",
                    background: "#7a1fa2",
                    color: "#fff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontWeight: 900,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
