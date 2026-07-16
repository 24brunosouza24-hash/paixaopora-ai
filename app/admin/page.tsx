import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { CashHistory } from "@/components/admin/CashHistory";
import { CashSummary } from "@/components/admin/CashSummary";
import { CashChart } from "@/components/admin/CashChart";
import ProductTable from "./products/ProductTable";
import OrdersFeed from "./orders/OrdersFeed";
import OptionsPage from "./options/OptionsPage";
import { TopProducts } from "@/components/admin/TopProducts";
import AdminSections from "@/components/admin/AdminSections";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!token || !verifyAdminToken(token)) {
    redirect("/admin/login");
  }

  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      variants: {
        orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
      },
      choices: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  const settings =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  return (
    <div
  style={{
    padding: 16,
    maxWidth: 1000,
    margin: "0 auto",
    background: "#54277b",
    minHeight: "100vh",
  }}
>
    <AdminSections
  caixa={<CashSummary />}
  grafico={<CashChart />}
  maisVendidos={<TopProducts />}
  historico={<CashHistory />}
/>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Painel Admin</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/"
            style={{
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 10,
              padding: "8px 10px",
              color: "#fff",
              background: "transparent",
              fontWeight: 700,
            }}
          >
            Ver cardápio
          </Link>

          <Link
            href="/admin/logout"
            style={{
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 10,
              padding: "8px 10px",
              color: "#fff",
              background: "transparent",
              fontWeight: 700,
            }}
          >
            Sair
          </Link>
        </div>
      </div>

      {/* ✅ Controle Aberto/Fechado */}
      <div
        style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Status da loja:{" "}
          <span style={{ color: settings.isOpen ? "#1b8f3a" : "#b00020" }}>
            {settings.isOpen ? "ABERTO" : "FECHADO"}
          </span>
        </div>

        <form
          action={async () => {
            "use server";
            const current =
              (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
              (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

            await prisma.storeSettings.update({
              where: { id: 1 },
              data: { isOpen: !current.isOpen },
            });
          }}
        >
          <button
            type="submit"
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 900,
              cursor: "pointer",
              background: settings.isOpen ? "#b00020" : "#1b8f3a",
              color: "#fff",
            }}
          >
            {settings.isOpen ? "Fechar loja" : "Abrir loja"}
          </button>
        </form>
      </div>

      {/* ✅ Produtos */}
      <ProductTable initialProducts={products} />

      {/* ✅ Extras */}
      <div style={{ marginTop: 16 }}>
        <OptionsPage />
      </div>

      {/* ✅ Pedidos */}
      <div style={{ marginTop: 16 }}>
        <OrdersFeed />
      </div>
    </div>
  );
}
