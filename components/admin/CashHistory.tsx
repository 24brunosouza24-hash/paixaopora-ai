"use client";

import { useEffect, useState } from "react";

type CashClosing = {
  id: string;
  createdAt: string;
  totalCents: number;
  ordersCount: number;
  cashCents: number;
  pixCents: number;
  cardCents: number;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export function CashHistory() {
  const [history, setHistory] = useState<CashClosing[]>([]);

  async function loadHistory() {
    const res = await fetch("/api/admin/cash/history", {
      cache: "no-store",
    });

    const json = await res.json();
    setHistory(json);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="text-xl font-bold">Histórico de Caixa</h2>

      {history.length === 0 ? (
        <p>Nenhum caixa fechado ainda.</p>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <p className="font-bold">{dateTime(item.createdAt)}</p>
              <p>Total: {money(item.totalCents)}</p>
              <p>Pedidos: {item.ordersCount}</p>

              <div className="mt-2 text-sm">
                <p>💵 {money(item.cashCents)}</p>
                <p>📲 {money(item.pixCents)}</p>
                <p>💳 {money(item.cardCents)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}