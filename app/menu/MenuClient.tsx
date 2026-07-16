"use client";

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

const STORE_NAME = "Paix\u00e3o por A\u00e7a\u00ed e Doces";

function normalizeKey(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function MenuClient({ sections }: { sections: Section[] }) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

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
            <div className={styles.title}>{STORE_NAME}</div>
            <div className={styles.subtitle}>Açaí, doces e sobremesas a um clique</div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.iconBtn}
              type="button"
              aria-label="Meus dados"
              onClick={() => window.dispatchEvent(new Event("acai_open_profile"))}
              title="Meus dados"
            >
              {"\u2699\uFE0F"}
            </button>

            <button
              className={styles.cartBtn}
              type="button"
              aria-label="Carrinho"
              onClick={() => window.dispatchEvent(new Event("acai_open_cart"))}
              title="Carrinho"
            >
              {"\u{1F6D2}"}
            </button>
          </div>
        </div>

        {sections.map((sec, sectionIndex) => (
          <section key={sec.key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBar} />
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
            </div>

            <div className={styles.grid}>
              {sec.items.map((p, itemIndex) => (
                <article key={p.id} className={styles.card}>
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
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

