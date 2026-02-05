"use client";

import { useEffect, useMemo, useState } from "react";
import CartDrawer from "@/app/cart/CartDrawer";
import styles from "./menu.module.css";

type VariantView = { id: string; label: string; priceCents: number };

type MenuItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  minPriceLabel: string;

  // ✅ novos (opcionais pra não quebrar o que já existe)
  category?: string; // "acai", "copo", "pudim", "doces"...
  kind?: string; // "ACAI" | "COPO" | "SIMPLE"
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

const POINTS_KEY = "acai_point_points_v1";

function loadPoints(): number {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function normalizeKey(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function MenuClient({ sections }: { sections: Section[] }) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    setPoints(loadPoints());

    const onPoints = () => setPoints(loadPoints());
    window.addEventListener("acai_points_updated", onPoints as any);
    return () => window.removeEventListener("acai_points_updated", onPoints as any);
  }, []);

  // carregar extras globais (adicionais/caldas/extras)
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
    for (const [k, arr] of map) {
      // mantém previsível
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      map.set(k, arr);
    }
    return map;
  }, [options]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.title}>Açaí Point</div>
            <div className={styles.subtitle}>Seu açaí favorito a um clique</div>
          </div>

          <div className={styles.actions}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 999,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#7a1fa2",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Pontos"
            >
              ⭐ {points}
            </div>

            <button
              className={styles.iconBtn}
              type="button"
              aria-label="Meus dados"
              onClick={() => window.dispatchEvent(new Event("acai_open_profile"))}
              title="Meus dados"
            >
              ⚙️
            </button>

            <button
              className={styles.cartBtn}
              type="button"
              aria-label="Carrinho"
              onClick={() => window.dispatchEvent(new Event("acai_open_cart"))}
              title="Carrinho"
            >
              🛒
            </button>
          </div>
        </div>

        {sections.map((sec) => (
          <section key={sec.key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBar} />
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
            </div>

            <div className={styles.grid}>
              {sec.items.map((p) => (
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
                        productKind={p.kind}          // ✅ novo
                        productCategory={p.category}  // ✅ novo
                        optionsByType={optionsByType}
                        loadingOptions={loadingOptions}
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
