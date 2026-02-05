import MenuClient from "@/app/menu/MenuClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    include: {
      variants: { orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
    },
  });

  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const cat = (p.category || "outros").trim().toLowerCase();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  const categoryOrder = ["acai", "copo da felicidade", "pudim", "doces", "outros"];

  const titleByCategory: Record<string, string> = {
    acai: "Açaí",
    "copo da felicidade": "Copo da Felicidade",
    pudim: "Pudim",
    doces: "Doces",
    outros: "Outros",
  };

  const sections = Array.from(byCategory.entries())
    .sort((a, b) => {
      const ia = categoryOrder.indexOf(a[0]);
      const ib = categoryOrder.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([catKey, list]) => {
      return {
        key: catKey,
        title: titleByCategory[catKey] || catKey,
        items: list.map((p) => {
          const kind = String(p.kind || "ACAI").toUpperCase();

          // menor preço: SIMPLE usa basePriceCents, senão usa a 1ª variant ordenada
          const min =
            kind === "SIMPLE"
              ? Number(p.basePriceCents ?? 0)
              : Number(p.variants?.[0]?.priceCents ?? 0);

          return {
            id: p.id,
            title: p.title,
            description: p.description || "",
            imageUrl: p.imageUrl || "",
            minPriceLabel: (min / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),

            // ✅ essenciais pro CartDrawer
            kind,
            category: (p.category || "outros").trim().toLowerCase(),
          };
        }),
      };
    });

  return <MenuClient sections={sections} />;
}
