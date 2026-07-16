import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payment = String(body.payment || "pix");
    const needChange = Boolean(body.needChange);
    const changeFor = needChange ? String(body.changeFor || "").trim() : "";

    const order = await prisma.order.create({
      data: {
        customerName: body.customerName || "",
        phone: body.phone || "",
        neighborhood: body.neighborhood || "",
        street: body.street || "",
        addressLine: body.addressLine || "",
        reference: body.reference || "",

        payment,
        needChange,
        changeFor,

        notes: body.notes || "",

        subtotalCents: Number(body.subtotalCents || 0),
        deliveryFeeCents: Number(body.deliveryFeeCents || 0),
        totalCents: Number(body.totalCents || 0),

        items: {
          create: Array.isArray(body.items)
            ? body.items.map((it: any) => ({
                productId: it.productId || "",
                title: it.title || "",
                kind: it.kind || "",
                variantLabel: it.variantLabel || "",
                qty: Number(it.qty || 1),
                unitPriceCents: Number(it.basePriceCents || 0),
                extrasJson: JSON.stringify(it.extras || []),
              }))
            : [],
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    console.error("Erro ao criar pedido:", e);

    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao criar pedido",
      },
      { status: 500 }
    );
  }
}