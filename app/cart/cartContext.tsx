"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type CartExtra = {
  id: string;
  type: string;
  name: string;
  priceCents: number;
};

export type CartItem = {
  productId: string;
  productTitle: string;
  imageUrl: string;
  variantId: string;
  variantLabel: string;
  unitPriceCents: number;
  qty: number;
  extras: CartExtra[];
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty: number) => void;
  removeItem: (index: number) => void;
  clear: () => void;

  redeem100: boolean;
  setRedeem100: (v: boolean) => void;

  totalQty: number;
  subtotalCents: number;
};

const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [redeem100, setRedeem100] = useState(false);

  const addItem: CartState["addItem"] = (item, qty) => {
    setItems((prev) => {
      const key = (x: CartItem) =>
        `${x.productId}|${x.variantId}|${x.extras.map((e) => e.id).sort().join(",")}`;

      const newKey = key({ ...(item as CartItem), qty: 1 });

      const idx = prev.findIndex((x) => key(x) === newKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }

      return [...prev, { ...(item as CartItem), qty }];
    });
  };

  const removeItem: CartState["removeItem"] = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clear = () => {
    setItems([]);
    setRedeem100(false);
  };

  const totalQty = useMemo(() => items.reduce((a, b) => a + b.qty, 0), [items]);

  const subtotalCents = useMemo(() => {
    return items.reduce((sum, it) => {
      const extrasSum = it.extras.reduce((s, e) => s + e.priceCents, 0);
      return sum + it.qty * (it.unitPriceCents + extrasSum);
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clear,
      redeem100,
      setRedeem100,
      totalQty,
      subtotalCents,
    }),
    [items, redeem100, totalQty, subtotalCents]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider />");
  return ctx;
}
