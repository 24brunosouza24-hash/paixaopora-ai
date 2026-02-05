"use client";

import { useEffect, useState } from "react";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Order = {
  id: string;
  createdAt: string;
  subtotalCents: number;
  pointsEarned: number;
  itemsJson: string;
};

export default function OrdersClientInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders/list")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setOrders(d.orders || []);
      })
      .finally(() => setLoading(false));
  }, []);

  function parseItems(itemsJson: string) {
    try {
      const data = JSON.parse(itemsJson);
      // nosso payload salva {items, payment, redeem100, ...} ou pode estar só items
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      return items;
    } catch {
      return [];
    }
  }

  if (loading) return <div>Carregando...</div>;

  if (orders.length === 0) {
    return <div style={{ opacity: 0.85 }}>Você ainda não fez nenhum pedido.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {orders.map((o) => {
        const items = parseItems(o.itemsJson);
        return (
          <div key={o.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>
                Pedido • {new Date(o.createdAt).toLocaleString("pt-BR")}
              </div>
              <div style={{ fontWeight: 900 }}>{brl(o.subtotalCents)}</div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Pontos ganhos: {o.pointsEarned}
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {items.slice(0, 6).map((it: any, idx: number) => (
                <div key={idx} style={{ fontSize: 13 }}>
                  • {it.productTitle} ({it.variantLabel}) x{it.qty}
                </div>
              ))}
              {items.length > 6 ? <div style={{ fontSize: 12, opacity: 0.75 }}>+ {items.length - 6} itens...</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
