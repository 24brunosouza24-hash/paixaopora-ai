"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../menu.module.css";
import CartDrawer from "../cart/CartDrawer";
import { useCart, CartExtra } from "../cart/cartContext";

type VariantView = { id: string; label: string; priceCents: number };

type ItemView = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  minPriceLabel: string;
  variants: VariantView[];
};

type SectionView = {
  key: string;
  title: string;
  items: ItemView[];
};

type OptionItem = { id: string; type: string; name: string; priceCents: number };

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MenuClient({ sections }: { sections: SectionView[] }) {
  const { addItem, totalQty } = useCart();

  const [cartOpen, setCartOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<ItemView | null>(null);
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);

  // extras
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/options")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setOptions(d.items || []);
      })
      .catch(() => {});
  }, []);

  const optionsByType = useMemo(() => {
    const map = new Map<string, OptionItem[]>();
    for (const o of options) {
      if (!map.has(o.type)) map.set(o.type, []);
      map.get(o.type)!.push(o);
    }
    return Array.from(map.entries());
  }, [options]);

  const selectedVariant = useMemo(() => {
    if (!selected) return null;
    return selected.variants.find((v) => v.id === variantId) || null;
  }, [selected, variantId]);

  const selectedExtras: CartExtra[] = useMemo(() => {
    const set = new Set(selectedExtraIds);
    return options
      .filter((o) => set.has(o.id))
      .map((o) => ({ id: o.id, type: o.type, name: o.name, priceCents: o.priceCents }));
  }, [options, selectedExtraIds]);

  function openAdd(p: ItemView) {
    setSelected(p);
    setVariantId(p.variants[0]?.id || "");
    setQty(1);
    setSelectedExtraIds([]);
    setModalOpen(true);
  }

  function toggleExtra(id: string) {
    setSelectedExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function confirmAdd() {
    if (!selected || !selectedVariant) return;

    addItem(
      {
        productId: selected.id,
        productTitle: selected.title,
        imageUrl: selected.imageUrl,
        variantId: selectedVariant.id,
        variantLabel: selectedVariant.label,
        unitPriceCents: selectedVariant.priceCents,
        extras: selectedExtras,
      },
      qty
    );

    setModalOpen(false);
    setSelected(null);
  }

  const extrasTotal = useMemo(() => selectedExtras.reduce((s, e) => s + e.priceCents, 0), [selectedExtras]);

  return (
    <div className={styles.page}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <div className={styles.brandTitle}>Açaí Point</div>
            <div className={styles.brandSubtitle}>Seu cardápio está no ar</div>
          </div>

          <div className={styles.rightArea}>
            <div className={styles.pill}>
              <span>👤</span>
              <span>Cliente</span>
            </div>

            <button className={styles.iconBtn} title="Configurações">⚙️</button>

            <button className={styles.iconBtn} title="Carrinho" onClick={() => setCartOpen(true)}>
              🛒{totalQty > 0 ? ` ${totalQty}` : ""}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        {sections.length === 0 ? (
          <div className={styles.empty}>Nenhum produto ativo ainda. Entre no Admin e crie seus produtos.</div>
        ) : (
          sections.map((sec) => (
            <section key={sec.key} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionBar} />
                <div className={styles.sectionTitle}>{sec.title}</div>
              </div>

              <div className={styles.grid}>
                {sec.items.map((p) => (
                  <article key={p.id} className={styles.card}>
                    <img
                      className={styles.cardImg}
                      src={p.imageUrl || "https://via.placeholder.com/600x400?text=Produto"}
                      alt={p.title}
                    />

                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{p.title}</h3>
                      <div className={styles.cardDesc}>{p.description || " "}</div>

                      <div className={styles.cardBottom}>
                        <div className={styles.price}>{p.minPriceLabel}</div>
                        <button className={styles.addBtn} onClick={() => openAdd(p)}>
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* MODAL */}
      {modalOpen && selected ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: 460,
              maxWidth: "95vw",
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,.08)" }}>
              <div style={{ fontWeight: 900 }}>{selected.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Escolha tamanho e extras</div>
            </div>

            <div style={{ padding: 12, display: "grid", gap: 12 }}>
              {/* variantes */}
              <div style={{ display: "grid", gap: 8 }}>
                {selected.variants.map((v) => (
                  <label
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,.12)",
                      cursor: "pointer",
                      background: v.id === variantId ? "rgba(122,31,162,.08)" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" checked={v.id === variantId} onChange={() => setVariantId(v.id)} />
                      <span style={{ fontWeight: 800 }}>{v.label}</span>
                    </div>
                    <span style={{ fontWeight: 900, color: "#7a1fa2" }}>{brl(v.priceCents)}</span>
                  </label>
                ))}
              </div>

              {/* extras */}
              {options.length > 0 ? (
                <div style={{ borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 10 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Extras</div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {optionsByType.map(([type, list]) => (
                      <div key={type} style={{ border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>{type}</div>

                        <div style={{ display: "grid", gap: 8 }}>
                          {list.map((o) => (
                            <label key={o.id} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedExtraIds.includes(o.id)}
                                  onChange={() => toggleExtra(o.id)}
                                />
                                <span>{o.name}</span>
                              </div>
                              <span style={{ fontWeight: 800, color: "#7a1fa2" }}>
                                {o.priceCents > 0 ? `+ ${brl(o.priceCents)}` : "Grátis"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* quantidade */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>Quantidade</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)", background: "#fff" }}
                  >
                    -
                  </button>
                  <div style={{ width: 30, textAlign: "center", fontWeight: 900 }}>{qty}</div>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,.2)", background: "#fff" }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* preview extras */}
              {selectedExtras.length > 0 ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Extras selecionados: {selectedExtras.map((e) => e.name).join(", ")} ( + {brl(extrasTotal)} )
                </div>
              ) : null}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,.08)", display: "flex", gap: 10 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ flex: 1, border: "1px solid rgba(0,0,0,.2)", borderRadius: 12, padding: 10, background: "#fff", fontWeight: 900 }}
              >
                Cancelar
              </button>

              <button
                onClick={confirmAdd}
                disabled={!selectedVariant}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 12,
                  padding: 10,
                  background: "#7a1fa2",
                  color: "#fff",
                  fontWeight: 900,
                  opacity: selectedVariant ? 1 : 0.5,
                  cursor: "pointer",
                }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
