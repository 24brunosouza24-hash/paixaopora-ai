import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const take = Number(searchParams.get("take") || 20);

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: true,
        items: true,
      },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
createdAt: o.createdAt,
status: o.status,
subtotalCents: o.subtotalCents,
      deliveryFeeCents: o.deliveryFeeCents,
      totalCents: o.totalCents,

      payment: o.payment,
      needChange: o.needChange,
      changeFor: o.changeFor,

      notes: o.notes,

      itemsJson: JSON.stringify(
        o.items.map((it) => ({
          productTitle: it.title,
          variantLabel: it.variantLabel || "",
          qty: it.qty,
          unitPriceCents: it.unitPriceCents,
          extras: it.extrasJson ? JSON.parse(it.extrasJson) : [],
        }))
      ),

      user: {
        phone: o.phone || o.user?.phone || "",
        name: o.customerName || o.user?.name || "",
        neighborhood: o.neighborhood || "",
        street: o.street || "",
        addressLine: o.addressLine || "",
        reference: o.reference || "",
      },
    }));

    return NextResponse.json({ ok: true, orders: formatted });
  } catch (err: any) {
    console.error("GET /api/admin/orders error:", err);

    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao buscar pedidos" },
      { status: 500 }
    );
  }
}