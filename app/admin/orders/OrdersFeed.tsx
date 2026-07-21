"use client";

import { useEffect, useRef, useState } from "react";

function brl(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type OrderItem = {
  productTitle?: string;
  title?: string;
  variantLabel?: string;
  qty?: number;
  extras?: { name: string; priceCents?: number }[];
};

type OrderStatus = "novo" | "preparo" | "finalizado";

type Order = {
  id: string;
  createdAt: string;
  status?: OrderStatus | string | null;

  subtotalCents: number;
  deliveryFeeCents?: number;
  totalCents?: number;

  payment?: string | null;
  needChange?: boolean;
  changeFor?: string | null;

  notes?: string | null;

  itemsJson: string;

  user: {
    phone: string;
    name: string | null;
    neighborhood?: string;
    street?: string;
    addressLine: string;
    reference: string | null;
  };
};

export default function OrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const lastSeenRef = useRef<string>("");

  function playSound() {
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch {}
  }

  function parseItems(itemsJson: string): OrderItem[] {
    try {
      const data = JSON.parse(itemsJson);
      return Array.isArray(data) ? data : data?.items || [];
    } catch {
      return [];
    }
  }

  function paymentLabel(payment?: string | null) {
    if (payment === "pix") return "PIX";
    if (payment === "dinheiro") return "Dinheiro";
    if (payment === "credito") return "Cartão de Crédito";
    if (payment === "debito") return "Cartão de Débito";
    return payment || "";
  }

  function getStatus(order: Order): OrderStatus {
  const s = String(order.status || "").toLowerCase().trim();

  if (s === "preparo") return "preparo";
  if (s === "finalizado") return "finalizado";

  return "novo";
}

  function printOrder(order: Order) {
    const items = parseItems(order.itemsJson);

    const itemsHtml = items
      .map((it, index) => {
        const title = it.productTitle || it.title || "Produto";
        const extras = Array.isArray(it.extras) ? it.extras : [];

        return `
          <div class="item">
            <strong>${index + 1}) ${title}</strong><br/>
            ${it.variantLabel ? `• Tamanho: ${it.variantLabel}<br/>` : ""}
            • Qtd: ${it.qty || 1}<br/>
            ${
              extras.length
                ? `• Itens: ${extras
                    .map((e) => `${e.name}${e.priceCents ? ` (+${brl(e.priceCents)})` : ""}`)
                    .join(", ")}<br/>`
                : "• Itens: nenhum<br/>"
            }
          </div>
        `;
      })
      .join("");

    const content = `
<html>
<head>
<title>Comanda</title>

<style>
@page {
  size: 58mm auto;
  margin: 1mm;
}

body {
  font-family: Arial, sans-serif;
  width: 48mm;
  max-width: 48mm;
  font-size: 13px;
  line-height: 1.25;
  color: #000;
  margin: 0;
  padding: 0 0 55mm 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

h2 {
  text-align: center;
  margin: 0 0 6px;
  font-size: 17px;
}

hr {
  border: none;
  border-top: 1px dashed #000;
  margin: 6px 0;
}

.item {
  margin-bottom: 8px;
}

.total {
  font-size: 16px;
  font-weight: bold;
  margin-top: 4px;
}

.cut-space {
  height: 55mm;
}
</style>
</head>

<body>

<h2>AÇAÍ POINT</h2>

<strong>Pedido</strong><br/>
Data: ${new Date(order.createdAt).toLocaleString("pt-BR")}<br/>
Status: ${getStatus(order).toUpperCase()}<br/>
Cliente: <strong>${order.user.name || "Sem nome"}</strong><br/>
Telefone: ${order.user.phone || ""}<br/>

<hr/>

<strong>Endereço</strong><br/>
Bairro: ${order.user.neighborhood || ""}<br/>
Rua: ${order.user.street || ""}<br/>
Número/Compl.: ${order.user.addressLine || ""}<br/>
${order.user.reference ? `Referência: ${order.user.reference}<br/>` : ""}

<hr/>

<strong>Itens</strong><br/><br/>
${itemsHtml || "Nenhum item"}

<hr/>

Subtotal: ${brl(order.subtotalCents || 0)}<br/>
Taxa de entrega: ${brl(order.deliveryFeeCents || 0)}<br/>
<div class="total">Total: ${brl(order.totalCents || 0)}</div>

<hr/>

Pagamento: <strong>${paymentLabel(order.payment)}</strong><br/>

${
  order.payment === "dinheiro"
    ? `
Troco: <strong>${order.needChange ? "SIM" : "NÃO"}</strong><br/>
${
  order.needChange && order.changeFor
    ? `Troco para: <strong>R$ ${order.changeFor}</strong><br/>`
    : ""
}
`
    : ""
}

${order.notes ? `Obs: ${order.notes}<br/>` : ""}

<div style="text-align:center;margin-top:50px;">

--------- CORTE AQUI ---------


</div>

<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
</body>
</html>

<div class="cut-space"></div>

</body>
</html>
`;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(content);
    win.document.close();

    setTimeout(() => {
      win.print();
    }, 300);
  }

  async function load() {
    const r = await fetch("/api/admin/orders?take=50", { cache: "no-store" });
    const d = await r.json();
    if (!d?.ok) return;

    const list: Order[] = d.orders || [];
    setOrders(list);

    const newestId = list[0]?.id || "";

    if (newestId && lastSeenRef.current && newestId !== lastSeenRef.current) {
      playSound();
      setNewOrderId(newestId);
      setTimeout(() => setNewOrderId(null), 5000);
    }

    if (newestId) lastSeenRef.current = newestId;
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    await fetch("/api/admin/orders/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: orderId,
        status,
      }),
    });

    await load();
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const novos = orders.filter((o) => getStatus(o) === "novo");
  const preparo = orders.filter((o) => getStatus(o) === "preparo");
  const finalizados = orders.filter((o) => getStatus(o) === "finalizado");

  function OrderCard({ order }: { order: Order }) {
    const status = getStatus(order);
    const isNew = newOrderId === order.id;

    return (
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 12,
          background: isNew ? "#fff3cd" : "#fff",
          color: "#111",
          border: isNew ? "3px solid #ffcc00" : "1px solid rgba(0,0,0,.12)",
          boxShadow: "0 2px 8px rgba(0,0,0,.12)",
        }}
      >
        <b>{new Date(order.createdAt).toLocaleString("pt-BR")}</b>

        <div style={{ marginTop: 4, fontWeight: 700 }}>
          {order.user.name || "Sem nome"} • {order.user.phone}
        </div>

        <div style={{ marginTop: 6 }}>
          Total: <b>{brl(order.totalCents || 0)}</b>
        </div>

        <div style={{ marginTop: 6 }}>
          Pagamento: <b>{paymentLabel(order.payment)}</b>
        </div>

        {order.notes ? (
          <div style={{ marginTop: 6 }}>
            Obs: <b>{order.notes}</b>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button
            onClick={() => printOrder(order)}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "9px 10px",
              fontWeight: 900,
              cursor: "pointer",
              background: "#222",
              color: "#fff",
            }}
          >
            Imprimir comanda
          </button>

          {status === "novo" ? (
            <button
              onClick={() => updateStatus(order.id, "preparo")}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "9px 10px",
                fontWeight: 900,
                cursor: "pointer",
                background: "#ff9800",
                color: "#111",
              }}
            >
              Ir para preparo
            </button>
          ) : null}

          {status === "preparo" ? (
            <>
              <button
                onClick={() => updateStatus(order.id, "novo")}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  background: "#ddd",
                  color: "#111",
                }}
              >
                Voltar
              </button>

              <button
                onClick={() => updateStatus(order.id, "finalizado")}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  background: "#1b8f3a",
                  color: "#fff",
                }}
              >
                Finalizar
              </button>
            </>
          ) : null}

          {status === "finalizado" ? (
            <button
              onClick={() => updateStatus(order.id, "preparo")}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "9px 10px",
                fontWeight: 900,
                cursor: "pointer",
                background: "#ddd",
                color: "#111",
              }}
            >
              Voltar para preparo
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function Column({
    title,
    orders,
    color,
  }: {
    title: string;
    orders: Order[];
    color: string;
  }) {
    return (
      <div
        style={{
          flex: 1,
          minWidth: 260,
          background: "rgba(255,255,255,.08)",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 14,
          padding: 10,
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            color: "#fff",
            background: color,
            padding: "10px 12px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 900,
          }}
        >
          {title} ({orders.length})
        </h3>

        {orders.length === 0 ? (
          <div
            style={{
              color: "#6b5f6f",
              fontWeight: 700,
              padding: 10,
            }}
          >
            Nenhum pedido
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ color: "#111827", marginBottom: 12 }}>Pedidos ao vivo</h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        <Column title="Novos" orders={novos} color="#b00020" />
        <Column title="Em preparo" orders={preparo} color="#ff9800" />
        <Column title="Finalizados" orders={finalizados} color="#1b8f3a" />
      </div>
    </div>
  );
}
