"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

function brl(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    if (payment === "credito") return "Cartao de credito";
    if (payment === "debito") return "Cartao de debito";
    return payment || "";
  }

  function getStatus(order: Order): OrderStatus {
    const s = String(order.status || "").toLowerCase().trim();
    if (s === "preparo") return "preparo";
    if (s === "finalizado") return "finalizado";
    return "novo";
  }

  function orderTime(order: Order) {
    return new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function orderDateTime(order: Order) {
    return new Date(order.createdAt).toLocaleString("pt-BR");
  }

  function renderItemLine(item: OrderItem) {
    const title = item.productTitle || item.title || "Produto";
    return String(item.qty || 1) + "x " + title;
  }

  function printOrder(order: Order) {
    const items = parseItems(order.itemsJson);
    const itemHtml = items.map((item) => {
      const extras = Array.isArray(item.extras) ? item.extras : [];
      const extrasText = extras.map((e) => e.name).filter(Boolean).join(", ");
      return [
        '<div class="item">',
        '<strong>' + escapeHtml(renderItemLine(item)) + '</strong>',
        item.variantLabel ? '<div>Tamanho: ' + escapeHtml(item.variantLabel) + '</div>' : '',
        extrasText ? '<div>Itens: ' + escapeHtml(extrasText) + '</div>' : '',
        '</div>',
      ].join('');
    }).join('');

    const content = [
      '<!doctype html><html><head><meta charset="utf-8" /><title>Comanda</title>',
      '<style>@page{size:58mm auto;margin:2mm}body{font-family:Arial,sans-serif;width:52mm;font-size:12px;line-height:1.28;color:#000;margin:0;word-break:break-word}h1{text-align:center;margin:0 0 6px;font-size:16px}.row{margin:3px 0}.label{font-weight:700}hr{border:none;border-top:1px dashed #000;margin:7px 0}.item{margin:0 0 7px}.total{font-size:15px;font-weight:800}.center{text-align:center}</style>',
      '</head><body>',
      '<h1>COMANDA</h1>',
      '<div class="row"><span class="label">Pedido:</span> ' + escapeHtml(orderDateTime(order)) + '</div>',
      '<div class="row"><span class="label">Status:</span> ' + escapeHtml(getStatus(order).toUpperCase()) + '</div>',
      '<hr />',
      '<div class="row"><span class="label">Cliente:</span> ' + escapeHtml(order.user.name || "Sem nome") + '</div>',
      '<div class="row"><span class="label">Telefone:</span> ' + escapeHtml(order.user.phone || "") + '</div>',
      '<div class="row"><span class="label">Bairro:</span> ' + escapeHtml(order.user.neighborhood || "") + '</div>',
      '<div class="row"><span class="label">Rua:</span> ' + escapeHtml(order.user.street || "") + '</div>',
      '<div class="row"><span class="label">Numero:</span> ' + escapeHtml(order.user.addressLine || "") + '</div>',
      order.user.reference ? '<div class="row"><span class="label">Referencia:</span> ' + escapeHtml(order.user.reference) + '</div>' : '',
      '<hr />',
      itemHtml || 'Nenhum item',
      '<hr />',
      '<div class="row"><span class="label">Subtotal:</span> ' + escapeHtml(brl(order.subtotalCents || 0)) + '</div>',
      '<div class="row"><span class="label">Taxa de entrega:</span> ' + escapeHtml(brl(order.deliveryFeeCents || 0)) + '</div>',
      '<div class="total">Total: ' + escapeHtml(brl(order.totalCents || 0)) + '</div>',
      '<div class="row"><span class="label">Pagamento:</span> ' + escapeHtml(paymentLabel(order.payment)) + '</div>',
      order.payment === "dinheiro" ? '<div class="row"><span class="label">Troco:</span> ' + (order.needChange ? 'SIM' : 'NAO') + '</div>' : '',
      order.needChange && order.changeFor ? '<div class="row"><span class="label">Troco para:</span> R$ ' + escapeHtml(order.changeFor) + '</div>' : '',
      order.notes ? '<div class="row"><span class="label">Obs:</span> ' + escapeHtml(order.notes) + '</div>' : '',
      '<hr /><div class="center">--------- CORTE AQUI ---------</div><br/><br/><br/><br/><br/><br/>',
      '</body></html>',
    ].join('');

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(content);
    win.document.close();
    setTimeout(() => win.print(), 300);
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status }),
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
    const items = parseItems(order.itemsJson);

    return (
      <article className={styles.orderCard + (isNew ? " " + styles.orderCardNew : "")}>
        <div className={styles.orderCardHeader}>
          <strong>Comanda</strong>
          <span>{orderTime(order)}</span>
        </div>

        <div className={styles.orderCustomer}>{order.user.name || "Sem nome"}</div>
        <div className={styles.orderPhone}>?? {order.user.phone}</div>

        <div className={styles.orderAddress}>
          <div><b>Bairro:</b> {order.user.neighborhood || "-"}</div>
          <div><b>Rua:</b> {order.user.street || "-"}</div>
          <div><b>Numero:</b> {order.user.addressLine || "-"}</div>
          {order.user.reference ? <div><b>Referencia:</b> {order.user.reference}</div> : null}
        </div>

        <div className={styles.orderItems}>
          {items.length === 0 ? <div>Nenhum item</div> : null}
          {items.map((item, index) => {
            const extras = Array.isArray(item.extras) ? item.extras : [];
            const extrasText = extras.map((e) => e.name).filter(Boolean).join(", ");
            return (
              <div key={order.id + "-" + index} className={styles.orderItem}>
                <strong>{renderItemLine(item)}</strong>
                {item.variantLabel ? <span>Tamanho: {item.variantLabel}</span> : null}
                {extrasText ? <span>{extrasText}</span> : null}
              </div>
            );
          })}
        </div>

        <div className={styles.orderPaymentRow}>
          <span>{paymentLabel(order.payment)}</span>
          <strong>{brl(order.totalCents || 0)}</strong>
        </div>

        {order.notes ? <div className={styles.orderNotes}>Obs: {order.notes}</div> : null}

        <div className={styles.orderActions}>
          {status === "novo" ? <button type="button" onClick={() => updateStatus(order.id, "preparo")} className={styles.warningButton}>Ir para preparo</button> : null}
          {status === "preparo" ? <button type="button" onClick={() => updateStatus(order.id, "finalizado")} className={styles.successButton}>Finalizar</button> : null}
          {status === "preparo" ? <button type="button" onClick={() => updateStatus(order.id, "novo")} className={styles.ghostButton}>Voltar</button> : null}
          {status === "finalizado" ? <button type="button" onClick={() => updateStatus(order.id, "preparo")} className={styles.ghostButton}>Voltar para preparo</button> : null}
          <button type="button" onClick={() => printOrder(order)} className={styles.ghostButton}>Imprimir comanda</button>
        </div>
      </article>
    );
  }

  function Column({ title, orders, color }: { title: string; orders: Order[]; color: string }) {
    return (
      <section className={styles.orderColumn}>
        <div className={styles.orderColumnTitle} style={{ background: color }}>
          <span>{title}</span>
          <b>{orders.length}</b>
        </div>
        {orders.length === 0 ? <div className={styles.orderEmpty}>Nenhum pedido</div> : orders.map((order) => <OrderCard key={order.id} order={order} />)}
      </section>
    );
  }

  return (
    <div className={styles.ordersFeed}>
      <div className={styles.ordersFeedHeader}>
        <div>
          <h2>Pedidos ao vivo</h2>
          <p>Acompanhe a producao</p>
        </div>
        <button type="button" onClick={load} className={styles.ghostButton}>Atualizar agora</button>
      </div>

      <div className={styles.ordersGrid}>
        <Column title="Novos" orders={novos} color="#cf0036" />
        <Column title="Em preparo" orders={preparo} color="#ff9200" />
        <Column title="Finalizados" orders={finalizados} color="#199746" />
      </div>
    </div>
  );
}
