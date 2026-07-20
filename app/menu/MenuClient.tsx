"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CartDrawer from "@/app/cart/CartDrawer";
import styles from "./menu.module.css";

type MenuItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  minPriceLabel: string;
  category?: string;
  kind?: string;
};

type Section = {
  key: string;
  title: string;
  items: MenuItem[];
};

type OptionItem = {
  id: string;
  type: string;
  name: string;
  priceCents: number;
};

type StoredCartExtra = { priceCents?: number };
type StoredCartItem = {
  productId?: string;
  qty?: number;
  basePriceCents?: number;
  extras?: StoredCartExtra[];
};

type CartSummary = {
  qty: number;
  subtotalCents: number;
  productQtyById: Record<string, number>;
};

const CART_KEY = "acai_point_cart_v1";

const STORE_NAME = "Paix\u00e3o por A\u00e7a\u00ed e Doces";

function normalizeKey(s: string) {
  return (s || "").trim().toLowerCase();
}

function loadCartSummary(): CartSummary {
  const empty = { qty: 0, subtotalCents: 0, productQtyById: {} };
  if (typeof window === "undefined") return empty;

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return empty;

    return items.reduce<CartSummary>((summary, item: StoredCartItem) => {
      const qty = Number(item.qty || 0);
      const extrasCents = Array.isArray(item.extras)
        ? item.extras.reduce((sum, extra) => sum + Number(extra.priceCents || 0), 0)
        : 0;
      const unitCents = Number(item.basePriceCents || 0) + extrasCents;

      summary.qty += qty;
      summary.subtotalCents += unitCents * qty;

      if (item.productId) {
        summary.productQtyById[item.productId] = (summary.productQtyById[item.productId] || 0) + qty;
      }

      return summary;
    }, empty);
  } catch {
    return empty;
  }
}

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MenuClient({ sections }: { sections: Section[] }) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [cartSummary, setCartSummary] = useState<CartSummary>({ qty: 0, subtotalCents: 0, productQtyById: {} });

  useEffect(() => {
    const updateCartSummary = () => setCartSummary(loadCartSummary());

    updateCartSummary();
    window.addEventListener("acai_cart_changed", updateCartSummary);
    window.addEventListener("storage", updateCartSummary);

    return () => {
      window.removeEventListener("acai_cart_changed", updateCartSummary);
      window.removeEventListener("storage", updateCartSummary);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/options", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (r.ok) setOptions(d?.items || []);
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, []);

  const optionsByType = useMemo(() => {
    const map = new Map<string, OptionItem[]>();

    for (const it of options) {
      const key = normalizeKey(it.type) || "outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }

    for (const [key, arr] of map) {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      map.set(key, arr);
    }

    return map;
  }, [options]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.logoFrame}>
              <Image className={styles.logo} src="/brand-logo-tight.png" alt="Paixão por Açaí e Doces" width={92} height={92} priority />
            </span>
            <div className={styles.brandText}>
              <div className={styles.title}>{STORE_NAME}</div>
              <div className={styles.subtitle}>Açaí, doces, a um clique</div>
            </div>
          </div>
        </div>

        {sections.map((sec, sectionIndex) => (
          <section key={sec.key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBar} />
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
            </div>

            <div className={styles.grid}>
              {sec.items.map((p, itemIndex) => {
                const productQty = cartSummary.productQtyById[p.id] || 0;

                return (
                  <article key={p.id} className={styles.card}>
                    {productQty > 0 ? <span className={styles.productQtyBadge}>{productQty}</span> : null}

                    <div className={styles.cardImageWrap}>
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.cardImage} src={p.imageUrl} alt={p.title} />
                      ) : (
                        <div className={styles.cardImagePlaceholder} />
                      )}
                    </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardName}>{p.title}</div>
                    <div className={styles.cardDesc}>{p.description}</div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.price}>{p.minPriceLabel}</div>

                    <div className={styles.drawerWrap}>
                      <CartDrawer
                        productId={p.id}
                        productTitle={p.title}
                        productKind={p.kind}
                        productCategory={p.category}
                        optionsByType={optionsByType}
                        loadingOptions={loadingOptions}
                        enableGlobalUi={sectionIndex === 0 && itemIndex === 0}
                      />
                    </div>
                  </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {cartSummary.qty > 0 ? (
        <button
          className={styles.bottomCartBar}
          type="button"
          aria-label="Abrir carrinho"
          onClick={() => window.dispatchEvent(new Event("acai_open_cart"))}
        >
          <span className={styles.bottomCartIcon}>{"\u{1F6D2}"}</span>
          <span className={styles.bottomCartLabel}>Total sem a entrega</span>
          <span className={styles.bottomCartValue}>
            {brl(cartSummary.subtotalCents)} / {cartSummary.qty} {cartSummary.qty === 1 ? "item" : "itens"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
