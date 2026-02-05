import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;

  if (!uid) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      createdAt: true,
      subtotalCents: true,
      earnedPoints: true,
      usedPoints: true,

      // ✅ pega os itens do pedido
      items: {
        select: {
          id: true,
          title: true,
          kind: true,
          variantLabel: true,
          qty: true,
          unitPriceCents: true,
          extrasJson: true, // ✅ aqui é onde fica o “json” dos extras
        },
      },
    },
  });

  return NextResponse.json({ ok: true, orders });
}
