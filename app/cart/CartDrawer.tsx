"use client";

import { useEffect, useMemo, useState } from "react";

type OptionItem = { id: string; type: string; name: string; priceCents: number };
type Variant = { id: string; label: string; priceCents: number };
type Choice = { id: string; name: string };

type ProductApi = {
  id: string;
  title: string;
  description: string | null;
  kind: string; // ACAI | COPO | SIMPLE
  basePriceCents: number;
  variants: Variant[];
  choices: Choice[];
};

type CartExtra = { id: string; name: string; priceCents: number; type: string };
type CartItem = {
  key: string;
  productId: string;
  title: string;
  kind: string;
  variantId: string; // "simple" para SIMPLE
  variantLabel: string; // vazio para SIMPLE
  basePriceCents: number; // unitário
  qty: number;
  extras: CartExtra[]; // inclui SABORES do COPO como extras type="sabores"
};

type CustomerProfile = {
  name: string;
  phone: string;
  neighborhood: string;
  street: string;
  addressLine: string;
  reference: string;
};

const CART_KEY = "acai_point_cart_v1";
const PROFILE_KEY = "acai_point_profile_v1";
const POINTS_KEY = "acai_point_points_v1";

const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").trim();
const DELIVERY_FEE_CENTS = 600;

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function normalizeType(t: string) {
  return (t || "outros").trim().toLowerCase();
}
function cleanPhoneBR(v: string) {
  return (v || "").replace(/\D/g, "");
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("acai_cart_changed"));
}

function loadProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p: any = JSON.parse(raw);
    if (!p) return null;

    return {
      name: String(p.name || ""),
      phone: String(p.phone || ""),
      neighborhood: String(p.neighborhood || ""),
      street: String(p.street || ""),
      addressLine: String(p.addressLine || ""),
      reference: String(p.reference || ""),
    };
  } catch {
    return null;
  }
}
function saveProfile(p: CustomerProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("acai_profile_changed"));
}

function loadPoints(): number {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function savePoints(n: number) {
  localStorage.setItem(POINTS_KEY, String(Math.max(0, Math.floor(n))));
  window.dispatchEvent(new Event("acai_points_updated"));
}

function calcItemTotal(item: CartItem) {
  const extras = item.extras.reduce((s, e) => s + (e.priceCents || 0), 0);
  const one = (item.basePriceCents || 0) + extras;
  return one * item.qty;
}
function buildItemKey(productId: string, variantId: string, extraIds: string[]) {
  const sorted = [...extraIds].sort().join(",");
  return `${productId}::${variantId}::${sorted}`;
}

export default function CartDrawer({
  productId,
  productTitle,
  productKind,
  productCategory,
  optionsByType,
  loadingOptions,
}: {
  productId: string;
  productTitle: string;
  productKind?: string; // vindo do MenuClient
  productCategory?: string; // vindo do MenuClient
  optionsByType?: Map<string, OptionItem[]>;
  loadingOptions?: boolean;
}) {
  // ===== modais
  const [openProduct, setOpenProduct] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  // ===== perfil
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pNeighborhood, setPNeighborhood] = useState("");
  const [pStreet, setPStreet] = useState("");
  const [pAddressLine, setPAddressLine] = useState("");
  const [pReference, setPReference] = useState("");

  // ===== carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [points, setPoints] = useState(0);

  // ===== produto carregado
  const [productInfo, setProductInfo] = useState<ProductApi | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);

  // extras (ACAI)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // sabores (COPO)
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<Record<string, boolean>>({});

  // checkout
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"pix" | "dinheiro" | "credito" | "debito">("pix");
  const [needChange, setNeedChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");

  // ✅ resgate 100 pts (só no carrinho)
  const [redeem100, setRedeem100] = useState(false);

  useEffect(() => {
    setPoints(loadPoints());
    const onPoints = () => setPoints(loadPoints());
    window.addEventListener("acai_points_updated", onPoints as any);
    return () => window.removeEventListener("acai_points_updated", onPoints as any);
  }, []);

  // eventos abrir carrinho / perfil
  useEffect(() => {
    const onOpenCart = () => {
      setCart(loadCart());
      setOpenCart(true);
    };
    const onOpenProfile = () => {
      const p = loadProfile();
      if (p) {
        setPName(p.name || "");
        setPPhone(p.phone || "");
        setPNeighborhood(p.neighborhood || "");
        setPStreet(p.street || "");
        setPAddressLine(p.addressLine || "");
        setPReference(p.reference || "");
      }
      setOpenProfile(true);
    };

    window.addEventListener("acai_open_cart", onOpenCart as any);
    window.addEventListener("acai_open_profile", onOpenProfile as any);

    return () => {
      window.removeEventListener("acai_open_cart", onOpenCart as any);
      window.removeEventListener("acai_open_profile", onOpenProfile as any);
    };
  }, []);

  // atualizar carrinho quando mudar
  useEffect(() => {
    const onChanged = () => setCart(loadCart());
    window.addEventListener("acai_cart_changed", onChanged as any);
    return () => window.removeEventListener("acai_cart_changed", onChanged as any);
  }, []);

  function ensureProfile() {
    const p = loadProfile();
    if (p && p.phone.trim() && p.neighborhood.trim() && p.street.trim() && p.addressLine.trim()) return true;

    if (p) {
      setPName(p.name || "");
      setPPhone(p.phone || "");
      setPNeighborhood(p.neighborhood || "");
      setPStreet(p.street || "");
      setPAddressLine(p.addressLine || "");
      setPReference(p.reference || "");
    }
    setOpenProfile(true);
    return false;
  }

  function onSaveProfile() {
    const phone = cleanPhoneBR(pPhone);
    if (!phone) return alert("Preencha seu WhatsApp.");
    if (!pNeighborhood.trim()) return alert("Preencha o Bairro.");
    if (!pStreet.trim()) return alert("Preencha a Rua.");
    if (!pAddressLine.trim()) return alert("Preencha o Número / Complemento.");

    saveProfile({
      name: pName.trim(),
      phone,
      neighborhood: pNeighborhood.trim(),
      street: pStreet.trim(),
      addressLine: pAddressLine.trim(),
      reference: pReference.trim(),
    });

    setOpenProfile(false);
  }

  // ===== fonte final de options
  const optionsByTypeFinal = useMemo(() => {
    return optionsByType && optionsByType.size > 0 ? optionsByType : new Map<string, OptionItem[]>();
  }, [optionsByType]);

  const optionById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    for (const [, arr] of optionsByTypeFinal) {
      for (const o of arr) map.set(o.id, o);
    }
    return map;
  }, [optionsByTypeFinal]);

  const adicionais = optionsByTypeFinal.get("adicionais") || [];
  const caldas = optionsByTypeFinal.get("caldas") || [];
  const extrasPaidTypes = ["cremes", "frutas", "toppings", "outros"].filter((t) => optionsByTypeFinal.has(t));

  // ===== abrir modal produto
  async function openAddProduct() {
    if (!ensureProfile()) return;

    // ✅ SIMPLE sem tela (adiciona direto)
    if (String(productKind || "").toUpperCase() === "SIMPLE") {
      const baseCents = 0; // vai buscar do server pra não errar
      setOpenProduct(true); // fallback: se preferir 100% sem fetch, mantém modal. Vamos fazer fetch e adicionar direto abaixo.
    }

    setOpenProduct(true);
  }

  // carrega infos do produto ao abrir modal
  useEffect(() => {
    if (!openProduct) return;

    (async () => {
      setVariantsLoading(true);
      setProductInfo(null);
      try {
        const r = await fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: "no-store" });
        const d = await r.json().catch(() => null);

        if (!r.ok) {
          console.error("ERRO AO BUSCAR PRODUTO:", r.status, d);
          setProductInfo(null);
          return;
        }

        const p: ProductApi = d?.product;
        setProductInfo(p);

        const k = String(p?.kind || "ACAI").toUpperCase();
        if (k === "SIMPLE") {
          // ✅ SIMPLE: adiciona direto, sem tela
          const current = loadCart();
          const key = buildItemKey(productId, "simple", []);
          const idx = current.findIndex((it) => it.key === key);

          if (idx >= 0) current[idx] = { ...current[idx], qty: current[idx].qty + 1 };
          else {
            current.push({
              key,
              productId,
              title: productTitle,
              kind: "SIMPLE",
              variantId: "simple",
              variantLabel: "",
              basePriceCents: p.basePriceCents || 0,
              qty: 1,
              extras: [],
            });
          }

          saveCart(current);
          setCart(current);
          setOpenProduct(false);
          setOpenCart(true);
          return;
        }

        setVariantId(p?.variants?.[0]?.id || "");
        setQty(1);
        setSelected({});
        setSelectedChoiceIds({});
      } catch (e) {
        console.error("ERRO AO BUSCAR PRODUTO:", e);
        setProductInfo(null);
      } finally {
        setVariantsLoading(false);
      }
    })();
  }, [openProduct, productId, productTitle]);

  const kind = String(productInfo?.kind || productKind || "ACAI").toUpperCase();

  const basePrice = useMemo(() => {
    if (!productInfo) return 0;
    if (kind === "SIMPLE") return productInfo.basePriceCents || 0;
    const v = productInfo.variants.find((x) => x.id === variantId);
    return v ? v.priceCents : 0;
  }, [productInfo, kind, variantId]);

  const selectedExtras = useMemo(() => {
    if (kind !== "ACAI") return [];
    const all: OptionItem[] = [];
    for (const [, arr] of optionsByTypeFinal) all.push(...arr);
    return all.filter((o) => selected[o.id]);
  }, [kind, optionsByTypeFinal, selected]);

  const selectedChoices = useMemo(() => {
    if (kind !== "COPO") return [];
    const list = productInfo?.choices || [];
    return list.filter((c) => !!selectedChoiceIds[c.id]);
  }, [kind, productInfo, selectedChoiceIds]);

  const extrasTotal = useMemo(() => selectedExtras.reduce((sum, o) => sum + (o.priceCents || 0), 0), [selectedExtras]);
  const totalOne = basePrice + extrasTotal;
  const totalAll = totalOne * qty;

  function toggleExtra(id: string) {
    const opt = optionById.get(id);
    const t = normalizeType(opt?.type || "");

    // ✅ max 2 caldas
    if (t === "caldas") {
      const currentSelectedCaldas = selectedExtras.filter((x) => normalizeType(x.type) === "caldas").length;
      const willSelect = !selected[id];

      if (willSelect && currentSelectedCaldas >= 2) {
        alert("Você pode escolher no máximo 2 caldas.");
        return;
      }
    }

    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleChoice(id: string) {
    setSelectedChoiceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addToCartReal() {
    if (!productInfo) return;

    const k = String(productInfo.kind || "ACAI").toUpperCase();

    if (k !== "SIMPLE" && !variantId) return alert("Selecione um tamanho antes de adicionar.");

    const v = k === "SIMPLE" ? null : productInfo.variants.find((x) => x.id === variantId) || null;

    const extras: CartExtra[] = [];

    if (k === "ACAI") {
      for (const e of selectedExtras) {
        extras.push({
          id: e.id,
          name: e.name,
          priceCents: e.priceCents || 0,
          type: normalizeType(e.type),
        });
      }
    }

    if (k === "COPO") {
      for (const c of selectedChoices) {
        extras.push({
          id: c.id,
          name: c.name,
          priceCents: 0,
          type: "sabores",
        });
      }
    }

    const baseCents = k === "SIMPLE" ? (productInfo.basePriceCents || 0) : (v?.priceCents || 0);
    const vId = k === "SIMPLE" ? "simple" : (v?.id || "");
    const vLabel = k === "SIMPLE" ? "" : (v?.label || "");

    const key = buildItemKey(productId, vId, extras.map((x) => x.id));

    const current = loadCart();
    const idx = current.findIndex((it) => it.key === key);

    if (idx >= 0) current[idx] = { ...current[idx], qty: current[idx].qty + qty };
    else {
      current.push({
        key,
        productId,
        title: productTitle,
        kind: k,
        variantId: vId,
        variantLabel: vLabel,
        basePriceCents: baseCents,
        qty,
        extras,
      });
    }

    saveCart(current);
    setOpenProduct(false);
    setCart(current);
    setOpenCart(true);
  }

  function removeItem(key: string) {
    const next = cart.filter((x) => x.key !== key);
    setCart(next);
    saveCart(next);
  }
  function incItem(key: string) {
    const next = cart.map((x) => (x.key === key ? { ...x, qty: x.qty + 1 } : x));
    setCart(next);
    saveCart(next);
  }
  function decItem(key: string) {
    const next = cart.map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x));
    setCart(next);
    saveCart(next);
  }
  function clearCart() {
    setRedeem100(false);
    setCart([]);
    saveCart([]);
  }

  // ===== totals + resgate (só no carrinho)
  const subtotalCents = useMemo(() => cart.reduce((s, it) => s + calcItemTotal(it), 0), [cart]);

  // ✅ regras do resgate:
  // - pontos >= 100
  // - carrinho com 1 item
  // - item ACAI
  // - 300ml
  // - qtd 1
  // - extras permitidos: apenas adicionais + caldas (todos grátis)
  // - caldas no máximo 2
  // - não pode ter cremes/frutas/toppings/outros pagos
  const eligibleRedeem = useMemo(() => {
    if (points < 100) return false;
    if (cart.length !== 1) return false;

    const it = cart[0];
    if ((it.kind || "").toUpperCase() !== "ACAI") return false;
    if (!/300/i.test(it.variantLabel || "")) return false;
    if (it.qty !== 1) return false;

    const extras = it.extras || [];

    const caldasCount = extras.filter((e) => normalizeType(e.type) === "caldas").length;
    if (caldasCount > 2) return false;

    for (const e of extras) {
      const t = normalizeType(e.type);

      // só permite adicionais e caldas
      if (t !== "adicionais" && t !== "caldas") return false;

      // tem que ser grátis
      if ((e.priceCents || 0) > 0) return false;
    }

    return true;
  }, [cart, points]);

  useEffect(() => {
    if (!eligibleRedeem && redeem100) setRedeem100(false);
  }, [eligibleRedeem, redeem100]);

  const redeemDiscountCents = useMemo(() => {
    if (!redeem100) return 0;
    if (!eligibleRedeem) return 0;
    return subtotalCents; // zera tudo
  }, [redeem100, eligibleRedeem, subtotalCents]);

  const subtotalAfterRedeem = Math.max(0, subtotalCents - redeemDiscountCents);

  const deliveryFeeCents = useMemo(() => {
    if (cart.length === 0) return 0;
    if (redeem100 && eligibleRedeem) return 0; // ✅ resgate sem taxa
    return DELIVERY_FEE_CENTS;
  }, [cart.length, redeem100, eligibleRedeem]);

  const cartTotal = subtotalAfterRedeem + deliveryFeeCents;

  function formatCheckoutMessage() {
    const p = loadProfile();

    const lines: string[] = [];
    lines.push(`🛒 *Pedido — Açaí Point*`);
    if (p?.name?.trim()) lines.push(`👤 Cliente: *${p.name.trim()}*`);
    lines.push("");

    if (redeem100 && eligibleRedeem) {
      lines.push(`🎁 *RESGATE:* 100 pontos por *Açaí 300ml grátis*`);
      lines.push(`✅ Permitido: adicionais grátis + até 2 caldas grátis`);
      lines.push(`❌ Não permitido: cremes/frutas/toppings/extras pagos`);
      lines.push("");
    }

    cart.forEach((it, i) => {
      lines.push(`*${i + 1}) ${it.title}*`);

      const k = (it.kind || "ACAI").toUpperCase();
      if (k !== "SIMPLE") lines.push(`• Tamanho: ${it.variantLabel}`);
      lines.push(`• Qtd: ${it.qty}`);

      if (it.extras.length) {
        const extrasTxt = it.extras
          .map((e) => `${e.name}${e.priceCents ? ` (+${brl(e.priceCents)})` : ""}`)
          .join(", ");
        lines.push(`• Itens: ${extrasTxt}`);
      } else {
        lines.push(`• Itens: nenhum`);
      }

      const itemTotal = calcItemTotal(it);
      const shown = redeem100 && eligibleRedeem ? 0 : itemTotal;
      lines.push(`• Subtotal: *${brl(shown)}*`);
      lines.push("");
    });

    lines.push(`📦 Subtotal: ${brl(subtotalAfterRedeem)}`);
    lines.push(`🚚 Taxa de entrega: ${brl(deliveryFeeCents)}`);
    lines.push("");
    lines.push(`💰 *Total: ${brl(cartTotal)}*`);
    lines.push("");

    const payLabel =
      payment === "pix"
        ? "PIX"
        : payment === "dinheiro"
        ? "Dinheiro"
        : payment === "credito"
        ? "Cartão de Crédito"
        : "Cartão de Débito";

    lines.push(`💳 Pagamento: *${payLabel}*`);

    if (payment === "dinheiro") {
      lines.push(`🪙 Troco: ${needChange ? `SIM (para ${changeFor || "?"})` : "NÃO"}`);
    }

    lines.push("");
    if (p?.neighborhood?.trim()) lines.push(`🏘️ Bairro: *${p.neighborhood.trim()}*`);
    if (p?.street?.trim()) lines.push(`📍 Rua: *${p.street.trim()}*`);
    if (p?.addressLine?.trim()) lines.push(`🏠 Número / Complemento: *${p.addressLine.trim()}*`);
    if (p?.reference?.trim()) lines.push(`📌 Referência: ${p.reference.trim()}`);

    if (notes.trim()) {
      lines.push("");
      lines.push(`📝 Obs: ${notes.trim()}`);
    }

    lines.push("");

    const pointsEarned = redeem100 && eligibleRedeem ? 0 : Math.floor(cartTotal / 300);
    const pointsAfter = Math.max(0, points - (redeem100 && eligibleRedeem ? 100 : 0)) + pointsEarned;

    lines.push(`⭐ Pontos ganhos: *${pointsEarned}*`);
    lines.push(`⭐ Pontos após pedido: *${pointsAfter}*`);

    return lines.join("\n");
  }

  function finalizeWhatsApp() {
    if (!ensureProfile()) return;

    if (cart.length === 0) return alert("Seu carrinho está vazio.");
    if (!WHATSAPP_NUMBER) {
      alert("Falta configurar o número do WhatsApp no .env.local:\nNEXT_PUBLIC_WHATSAPP_NUMBER=5532998212071");
      return;
    }
    if (payment === "dinheiro" && needChange && !changeFor.trim()) {
      alert("Informe o valor para troco.");
      return;
    }

    if (redeem100 && !eligibleRedeem) {
      alert(
        "Para resgatar 100 pontos:\n- Carrinho com 1 Açaí 300ml (qtd 1)\n- Pode adicionais grátis ilimitados\n- Pode no máximo 2 caldas grátis\n- Não pode cremes/frutas/toppings/extras pagos"
      );
      return;
    }

    const msg = formatCheckoutMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

    const current = loadPoints();
    const earned = redeem100 && eligibleRedeem ? 0 : Math.floor(cartTotal / 300);
    const next = Math.max(0, current - (redeem100 && eligibleRedeem ? 100 : 0)) + earned;
    savePoints(next);

    clearCart();
    setOpenCart(false);
  }

  const textBlack = { color: "#111" as const };

  return (
    <>
      {/* BOTÃO DO CARD */}
      <button onClick={openAddProduct} type="button">
        Adicionar
      </button>

      {/* MODAL PERFIL */}
      {openProfile ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 14,
          }}
          onClick={() => setOpenProfile(false)}
        >
          <div
            style={{
              width: 520,
              maxWidth: "92vw",
              background: "#fff",
              borderRadius: 16,
              padding: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              color: "#111",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: "#7a1fa2" }}>Seus dados</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, ...textBlack }}>
              Obrigatório para finalizar pedidos e pontuação.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Seu nome (opcional)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <input
                value={pPhone}
                onChange={(e) => setPPhone(e.target.value)}
                placeholder="Seu WhatsApp * (DDD + número)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <input
                value={pNeighborhood}
                onChange={(e) => setPNeighborhood(e.target.value)}
                placeholder="Bairro *"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <input
                value={pStreet}
                onChange={(e) => setPStreet(e.target.value)}
                placeholder="Rua *"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <input
                value={pAddressLine}
                onChange={(e) => setPAddressLine(e.target.value)}
                placeholder="Número / Complemento * (nº, casa, apt...)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <input
                value={pReference}
                onChange={(e) => setPReference(e.target.value)}
                placeholder="Referência (opcional)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.15)",
                  background: "#fff",
                  color: "#111",
                }}
              />

              <button
                type="button"
                onClick={onSaveProfile}
                style={{
                  border: "none",
                  background: "#7a1fa2",
                  color: "#fff",
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL DO PRODUTO */}
      {openProduct ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 14,
          }}
          onClick={() => setOpenProduct(false)}
        >
          <div
  style={{
    width: 560,
    maxWidth: "92vw",
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    color: "#111",

    // ✅ permite rolar como o carrinho
    maxHeight: "86vh",
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
  }}
  onClick={(e) => e.stopPropagation()}
>

            <div style={{ fontWeight: 900, fontSize: 18, ...textBlack }}>{productTitle}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2, ...textBlack }}>
              {kind === "COPO" ? "Escolha tamanho e sabores" : kind === "ACAI" ? "Escolha tamanho e adicionais" : "Escolha quantidade"}
            </div>

            {variantsLoading || !productInfo ? (
              <div style={{ marginTop: 12, opacity: 0.75 }}>Carregando...</div>
            ) : (
              <>
                {/* Tamanho (ACAI/COPO) */}
                {kind !== "SIMPLE" ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8, ...textBlack }}>Tamanho</div>

                    {productInfo.variants.length === 0 ? (
                      <div style={{ color: "#b00020", fontWeight: 900 }}>
                        Não achei os tamanhos desse produto.
                        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginTop: 6 }}>
                          No Admin, crie variantes (ex: 150/300 ou 300/500).
                        </div>
                      </div>
                    ) : (
                      productInfo.variants.map((v) => (
                        <label
                          key={v.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 12,
                            padding: 10,
                            marginBottom: 10,
                            background: variantId === v.id ? "rgba(122,31,162,.07)" : "#fff",
                            cursor: "pointer",
                            color: "#111",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="radio" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                            <b style={{ color: "#111" }}>{v.label}</b>
                          </div>

                          <b style={{ color: "#7a1fa2" }}>{brl(v.priceCents)}</b>
                        </label>
                      ))
                    )}
                  </div>
                ) : null}

                {/* COPO: só sabores */}
                {kind === "COPO" ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8, ...textBlack }}>Sabores</div>

                    {productInfo.choices?.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {productInfo.choices.map((c) => (
                          <label
                            key={c.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              border: "1px solid rgba(0,0,0,.12)",
                              borderRadius: 12,
                              padding: 10,
                              cursor: "pointer",
                              color: "#111",
                            }}
                          >
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={!!selectedChoiceIds[c.id]}
                                onChange={() => toggleChoice(c.id)}
                              />
                              <span style={{ fontWeight: 800, color: "#111" }}>{c.name}</span>
                            </div>

                            <span style={{ fontWeight: 900, color: "#1b8f3a" }}>Grátis</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.75 }}>Nenhum sabor cadastrado no Admin.</div>
                    )}
                  </div>
                ) : null}

                {/* ACAI: adicionais, caldas, extras */}
                {kind === "ACAI" ? (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8, ...textBlack }}>Adicionais</div>

                      {loadingOptions ? (
                        <div style={{ opacity: 0.7, ...textBlack }}>Carregando adicionais...</div>
                      ) : adicionais.length === 0 ? (
                        <div style={{ opacity: 0.75, ...textBlack }}>Nenhum adicional cadastrado.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {adicionais.map((o) => (
                            <label
                              key={o.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                border: "1px solid rgba(0,0,0,.12)",
                                borderRadius: 12,
                                padding: 10,
                                cursor: "pointer",
                                color: "#111",
                              }}
                            >
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <input type="checkbox" checked={!!selected[o.id]} onChange={() => toggleExtra(o.id)} />
                                <span style={{ fontWeight: 800, color: "#111" }}>{o.name}</span>
                              </div>

                              <span style={{ fontWeight: 900, color: "#1b8f3a" }}>Grátis</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8, ...textBlack }}>Caldas (máx. 2)</div>

                      {loadingOptions ? (
                        <div style={{ opacity: 0.7, ...textBlack }}>Carregando caldas...</div>
                      ) : caldas.length === 0 ? (
                        <div style={{ opacity: 0.75, ...textBlack }}>Nenhuma calda cadastrada.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {caldas.map((o) => (
                            <label
                              key={o.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                border: "1px solid rgba(0,0,0,.12)",
                                borderRadius: 12,
                                padding: 10,
                                cursor: "pointer",
                                color: "#111",
                              }}
                            >
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <input type="checkbox" checked={!!selected[o.id]} onChange={() => toggleExtra(o.id)} />
                                <span style={{ fontWeight: 800, color: "#111" }}>{o.name}</span>
                              </div>

                              <span style={{ fontWeight: 900, color: "#1b8f3a" }}>
                                {o.priceCents > 0 ? brl(o.priceCents) : "Grátis"}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8, ...textBlack }}>Extras</div>

                      {loadingOptions ? (
                        <div style={{ opacity: 0.7, ...textBlack }}>Carregando extras...</div>
                      ) : extrasPaidTypes.length === 0 ? (
                        <div style={{ opacity: 0.75, ...textBlack }}>Nenhum extra cadastrado.</div>
                      ) : (
                        <>
                          {extrasPaidTypes.map((type) => {
                            const list = optionsByTypeFinal.get(type)!;
                            const title = type.charAt(0).toUpperCase() + type.slice(1);

                            return (
                              <div key={type} style={{ marginBottom: 10 }}>
                                <div style={{ fontWeight: 900, fontSize: 13, color: "#5a137a", marginBottom: 6 }}>
                                  {title}
                                </div>

                                <div style={{ display: "grid", gap: 8 }}>
                                  {list.map((o) => (
                                    <label
                                      key={o.id}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        border: "1px solid rgba(0,0,0,.12)",
                                        borderRadius: 12,
                                        padding: 10,
                                        cursor: "pointer",
                                        color: "#111",
                                      }}
                                    >
                                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <input
                                          type="checkbox"
                                          checked={!!selected[o.id]}
                                          onChange={() => toggleExtra(o.id)}
                                        />
                                        <span style={{ fontWeight: 800, color: "#111" }}>{o.name}</span>
                                      </div>

                                      <span style={{ fontWeight: 900, color: "#7a1fa2" }}>{brl(o.priceCents || 0)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </>
                ) : null}

                {/* Quantidade */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <div style={{ fontWeight: 900, flex: 1, ...textBlack }}>Quantidade</div>

                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    type="button"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,.2)",
                      background: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      color: "#111",
                    }}
                  >
                    -
                  </button>

                  <div style={{ width: 32, textAlign: "center", fontWeight: 900, color: "#111" }}>{qty}</div>

                  <button
                    onClick={() => setQty((q) => q + 1)}
                    type="button"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,.2)",
                      background: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      color: "#111",
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Botões */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                  <button
                    onClick={() => setOpenProduct(false)}
                    type="button"
                    style={{
                      flex: 1,
                      marginRight: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,.2)",
                      background: "#fff",
                      padding: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                      color: "#111",
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={addToCartReal}
                    type="button"
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: "none",
                      background: "#7a1fa2",
                      color: "#fff",
                      padding: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Adicionar • {brl(totalAll)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* CARRINHO + CHECKOUT */}
      {openCart ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 14,
          }}
          onClick={() => setOpenCart(false)}
        >
          <div
            style={{
              width: 640,
              maxWidth: "94vw",
              background: "#fff",
              borderRadius: 16,
              padding: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              maxHeight: "86vh",
              overflow: "auto",
              color: "#111",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>Carrinho</div>
              <button
                type="button"
                onClick={clearCart}
                style={{
                  border: "1px solid rgba(0,0,0,.2)",
                  background: "#fff",
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#111",
                }}
              >
                Limpar
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ marginTop: 12, opacity: 0.75, color: "#111" }}>Seu carrinho está vazio.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {cart.map((it) => (
                  <div
                    key={it.key}
                    style={{
                      border: "1px solid rgba(0,0,0,.12)",
                      borderRadius: 12,
                      padding: 10,
                      color: "#111",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#111" }}>{it.title}</div>
                        {(it.kind || "ACAI").toUpperCase() !== "SIMPLE" ? (
                          <div style={{ fontSize: 12, opacity: 0.75, color: "#111" }}>Tamanho: {it.variantLabel}</div>
                        ) : null}
                        {it.extras.length ? (
                          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, color: "#111" }}>
                            Itens:{" "}
                            {it.extras
                              .map((e) => `${e.name}${e.priceCents ? ` (+${brl(e.priceCents)})` : ""}`)
                              .join(", ")}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, color: "#7a1fa2" }}>
                          {redeem100 && eligibleRedeem ? brl(0) : brl(calcItemTotal(it))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.key)}
                          style={{
                            marginTop: 6,
                            border: "none",
                            background: "transparent",
                            color: "#b00020",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => decItem(it.key)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,.2)",
                          background: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                          color: "#111",
                        }}
                      >
                        -
                      </button>
                      <div style={{ width: 24, textAlign: "center", fontWeight: 900, color: "#111" }}>{it.qty}</div>
                      <button
                        type="button"
                        onClick={() => incItem(it.key)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,.2)",
                          background: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                          color: "#111",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RESGATE (só aqui) */}
            <div style={{ marginTop: 12, border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Pontos: ⭐ {points}</div>

              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: eligibleRedeem ? 1 : 0.6 }}>
                <input
                  type="checkbox"
                  disabled={!eligibleRedeem}
                  checked={redeem100}
                  onChange={(e) => setRedeem100(e.target.checked)}
                />
                <span style={{ fontWeight: 800 }}>
                  Trocar 100 pontos por Açaí 300ml grátis (sem taxa)
                </span>
              </label>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Para ativar: carrinho com <b>1</b> Açaí <b>300ml</b> (qtd 1). Pode{" "}
                <b>adicionais grátis ilimitados</b> e <b>no máximo 2 caldas grátis</b>. Não pode{" "}
                <b>cremes/frutas/toppings/extras pagos</b>.
              </div>
            </div>

            {/* checkout */}
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8, color: "#111" }}>Finalizar pedido</div>

              <div style={{ display: "grid", gap: 10 }}>
                <input
                  value={loadProfile()?.name || ""}
                  readOnly
                  placeholder="Seu nome (opcional)"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    color: "#111",
                  }}
                />

                <input
                  value={loadProfile()?.neighborhood || ""}
                  readOnly
                  placeholder="Bairro *"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    color: "#111",
                  }}
                />

                <input
                  value={loadProfile()?.street || ""}
                  readOnly
                  placeholder="Rua *"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    color: "#111",
                  }}
                />

                <input
                  value={loadProfile()?.addressLine || ""}
                  readOnly
                  placeholder="Número / Complemento *"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    color: "#111",
                  }}
                />

                <input
                  value={loadProfile()?.reference || ""}
                  readOnly
                  placeholder="Referência (opcional)"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    color: "#111",
                  }}
                />

                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("acai_open_profile"))}
                  style={{
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    padding: 12,
                    borderRadius: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Editar dados
                </button>

                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    background: "#fff",
                    fontWeight: 900,
                    color: "#111",
                  }}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                </select>

                {payment === "dinheiro" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#111" }}>
                      <input type="checkbox" checked={needChange} onChange={(e) => setNeedChange(e.target.checked)} />
                      Precisa de troco?
                    </label>

                    {needChange ? (
                      <input
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        placeholder="Troco para quanto? Ex: 50,00"
                        style={{
                          width: "100%",
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,.15)",
                          background: "#fff",
                          color: "#111",
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações (opcional)"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.15)",
                    resize: "vertical",
                    background: "#fff",
                    color: "#111",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.85 }}>Subtotal: {brl(subtotalAfterRedeem)}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.85 }}>Taxa de entrega: {brl(deliveryFeeCents)}</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Total: {brl(cartTotal)}</div>
                </div>

                <button
                  type="button"
                  onClick={finalizeWhatsApp}
                  style={{
                    border: "none",
                    background: "#7a1fa2",
                    color: "#fff",
                    padding: "12px 14px",
                    borderRadius: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Enviar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
