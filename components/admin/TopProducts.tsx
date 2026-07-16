"use client";

import { useEffect, useState } from "react";

type TopProduct = {
  title: string;
  qty: number;
};

export function TopProducts() {
  const [products, setProducts] = useState<TopProduct[]>([]);

  async function loadTopProducts() {
    const res = await fetch("/api/admin/products/top", {
      cache: "no-store",
    });

    const json = await res.json();
    setProducts(json);
  }

  useEffect(() => {
    loadTopProducts();

    const interval = setInterval(loadTopProducts, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="text-xl font-bold">🏆 Produtos mais vendidos</h2>

      {products.length === 0 ? (
        <p>Nenhum produto vendido ainda.</p>
      ) : (
        <div className="space-y-2">
          {products.map((product, index) => (
            <div
              key={product.title}
              className="flex justify-between rounded-lg border p-3"
            >
              <span>
                {index + 1}. {product.title}
              </span>

              <strong>{product.qty} vendas</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}