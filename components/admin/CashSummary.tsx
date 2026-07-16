"use client";

import { useEffect, useState } from "react";

type PaymentSummary = {
  cash: number;
  pix: number;
  card: number;
};

type CashPeriod = {
  totalCents: number;
  ordersCount: number;
  byPayment: PaymentSummary;
};

type CashData = {
  today: CashPeriod;
  week: CashPeriod;
  month: CashPeriod;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CashSummary() {
  const [data, setData] = useState<CashData | null>(null);
  const [closing, setClosing] = useState(false);

  async function loadCash() {
    const res = await fetch("/api/admin/cash", {
      cache: "no-store",
    });

    const json = await res.json();
    setData(json);
  }

  async function closeCash() {
    const confirmClose = confirm("Deseja fechar o caixa de hoje?");

    if (!confirmClose) return;

    setClosing(true);

    try {
      const res = await fetch("/api/admin/cash/close", {
        method: "POST",
      });

      if (!res.ok) {
        alert("Erro ao fechar caixa.");
        return;
      }

      alert("Caixa fechado com sucesso!");
      await loadCash();
    } finally {
      setClosing(false);
    }
  }

  useEffect(() => {
    loadCash();

    const interval = setInterval(loadCash, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="text-xl font-bold">Caixa</h2>
        <p>Carregando...</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Caixa</h2>

        <button
          type="button"
          onClick={closeCash}
          disabled={closing}
          className="rounded-lg border px-4 py-2 font-bold disabled:opacity-60"
        >
          {closing ? "Fechando..." : "Fechar Caixa"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Hoje</p>
          <strong className="text-2xl">{money(data.today.totalCents)}</strong>
          <p className="text-sm">{data.today.ordersCount} pedidos</p>

          <div className="mt-2 text-sm">
            <p>💵 {money(data.today.byPayment.cash)}</p>
            <p>📲 {money(data.today.byPayment.pix)}</p>
            <p>💳 {money(data.today.byPayment.card)}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Semana</p>
          <strong className="text-2xl">{money(data.week.totalCents)}</strong>
          <p className="text-sm">{data.week.ordersCount} pedidos</p>

          <div className="mt-2 text-sm">
            <p>💵 {money(data.week.byPayment.cash)}</p>
            <p>📲 {money(data.week.byPayment.pix)}</p>
            <p>💳 {money(data.week.byPayment.card)}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Mês</p>
          <strong className="text-2xl">{money(data.month.totalCents)}</strong>
          <p className="text-sm">{data.month.ordersCount} pedidos</p>

          <div className="mt-2 text-sm">
            <p>💵 {money(data.month.byPayment.cash)}</p>
            <p>📲 {money(data.month.byPayment.pix)}</p>
            <p>💳 {money(data.month.byPayment.card)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}