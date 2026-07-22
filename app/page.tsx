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

  const settings =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const baseCat = (p.category || "outros").trim().toLowerCase();
    const customTitle = (p.categoryTitle || "").trim();
    const cat = baseCat === "outros" && customTitle ? `outros:${customTitle.toLowerCase()}` : baseCat;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  const categoryOrder = ["acai", "sorvete", "copo da felicidade", "pudim", "cookies", "doces", "outros"];

  const titleByCategory: Record<string, string> = {
    acai: "Açaí",
    sorvete: "Sorvete",
    "copo da felicidade": "Copo da Felicidade",
    pudim: "Pudim",
    cookies: "Cookies",
    doces: "Doces",
    outros: "Outros",
  };

  const sections = Array.from(byCategory.entries())
    .sort((a, b) => {
      const ca = a[0].startsWith("outros:") ? "outros" : a[0];
      const cb = b[0].startsWith("outros:") ? "outros" : b[0];
      const ia = categoryOrder.indexOf(ca);
      const ib = categoryOrder.indexOf(cb);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([catKey, list]) => {
      return {
        key: catKey,
        title: list.find((p) => p.categoryTitle)?.categoryTitle || titleByCategory[catKey] || catKey,
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

  return (
    <MenuClient
      sections={sections}
      storeStatus={{
        isOpen: settings.isOpen,
        openHours: settings.openHours || "18h as 23h30",
        promotionText: settings.promotionText || "",
        promotionImageUrl: settings.promotionImageUrl || "",
      }}
    />
  );
}
