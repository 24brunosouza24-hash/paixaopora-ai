"use client";

import { useEffect, useRef, useState } from "react";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Order = {
  id: string;
  createdAt: string;
  subtotalCents: number;
  pointsEarned: number;
  itemsJson: string;
  user: { phone: string; name: string | null; addressLine: string; reference: string | null };
};

export default function OrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const lastSeenRef = useRef<string>("");

  async function askPermission() {
    if (!("Notification" in window)) return alert("Seu navegador não suporta notificação.");
    const p = await Notification.requestPermission();
    setNotifEnabled(p === "granted");
  }

  function parseItems(itemsJson: string) {
    try {
      const data = JSON.parse(itemsJson);
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      return items;
    } catch {
      return [];
    }
  }

  async function load() {
    const r = await fetch("/api/admin/orders?take=20");
    const d = await r.json();
    if (!d?.ok) return;

    const list: Order[] = d.orders || [];
    setOrders(list);

    const newestId = list[0]?.id || "";
    if (newestId && lastSeenRef.current && newestId !== lastSeenRef.current) {
      // pedido novo
      if (notifEnabled && "Notification" in window) {
        new Notification("Novo pedido!", {
          body: `Chegou um novo pedido • ${brl(list[0].subtotalCents)}`,
        });
      }
    }
    if (newestId) lastSeenRef.current = newestId;
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifEnabled]);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Pedidos (ao vivo)</div>
        <button
          onClick={askPermission}
          style={{
            border: "1px solid rgba(255,255,255,.25)",
            borderRadius: 10,
            padding: "8px 10px",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {notifEnabled ? "Notificações ativadas" : "Ativar notificações"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {orders.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Nenhum pedido ainda.</div>
        ) : (
          orders.map((o) => {
            const items = parseItems(o.itemsJson);
            const first = items[0];
            return (
              <div key={o.id} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    {new Date(o.createdAt).toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontWeight: 900 }}>{brl(o.subtotalCents)}</div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  Cliente: {o.user.name || "Sem nome"} • {o.user.phone}
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  Endereço: {o.user.addressLine}{o.user.reference ? ` (Ref: ${o.user.reference})` : ""}
                </div>

                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {first ? `• ${first.productTitle} (${first.variantLabel}) x${first.qty}` : "• Itens no pedido"}
                  {items.length > 1 ? `  +${items.length - 1} itens` : ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
