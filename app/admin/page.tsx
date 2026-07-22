import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import ProductTable from "./products/ProductTable";
import OrdersFeed from "./orders/OrdersFeed";
import OptionsPage from "./options/OptionsPage";
import AdminStorePanel from "./AdminStorePanel";
import styles from "./admin.module.css";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!token || !verifyAdminToken(token)) {
    redirect("/admin/login");
  }

  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      variants: { orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
      choices: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });

  const settings =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  return (
    <div className={styles.adminPage}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brandRow}>
            <Image className={styles.adminLogo} src="/brand-logo-tight.png" alt="Paixao por Acai e Doces" width={92} height={92} priority />
            <div>
              <p className={styles.eyebrow}>Area restrita</p>
              <h1 className={styles.heroTitle}>Painel administrativo</h1>
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link href="/" className={styles.outlineButton}>Abrir cardapio</Link>
            <Link href="/admin/logout" className={styles.outlineButton}>Sair</Link>
          </div>
        </div>
      </header>

      <main className={styles.shell}>
        <section className={styles.panel}>
          <AdminStorePanel
            initialIsOpen={settings.isOpen}
            initialOpenHours={settings.openHours || "18h as 23h30"}
            initialPromotionText={settings.promotionText || ""}
            initialPromotionImageUrl={settings.promotionImageUrl || ""}
          />

          <p className={styles.kicker}>Pedidos ao vivo</p>
          <OrdersFeed />

          <ProductTable initialProducts={products} />
          <OptionsPage />
        </section>
      </main>
    </div>
  );
}
