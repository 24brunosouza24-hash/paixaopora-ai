import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OrdersClientInner from "./OrdersClientInner";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;

  if (!uid) redirect("/login");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Meus pedidos</h1>
      <OrdersClientInner />
    </div>
  );
}
