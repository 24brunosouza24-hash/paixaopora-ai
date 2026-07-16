"use client";

import { useEffect, useState } from "react";

type ChartItem = {
  label: string;
  totalCents: number;
  ordersCount: number;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CashChart() {
  const [data, setData] = useState<ChartItem[]>([]);
  const [range, setRange] = useState(7);

  async function loadChart() {
    const res = await fetch(`/api/admin/cash/chart?days=${range}`, {
      cache: "no-store",
    });

    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    loadChart();

    const interval = setInterval(loadChart, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const max = Math.max(...data.map((d) => d.totalCents), 1);

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Vendas ({range} dias)</h2>

        <div className="flex gap-2">
          {[7, 15, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d)}
              className={`px-3 py-1 rounded border ${
                range === d ? "bg-white text-black" : ""
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3 h-48 overflow-x-auto">
        {data.map((item) => {
          const height =
            item.totalCents > 0
              ? Math.max((item.totalCents / max) * 100, 8)
              : 0;

          return (
            <div
              key={item.label}
              className="min-w-12 flex-1 h-full flex flex-col justify-end text-center"
            >
              <p className="text-xs mb-1">{money(item.totalCents)}</p>

              <div className="h-36 flex items-end">
                <div
                  className="w-full rounded bg-green-500"
                  style={{ height: `${height}%` }}
                  title={`${money(item.totalCents)} (${item.ordersCount} pedidos)`}
                />
              </div>

              <p className="text-xs mt-1">{item.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
