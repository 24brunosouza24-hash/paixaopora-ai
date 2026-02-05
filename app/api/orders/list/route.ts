import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;

  if (!uid) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, createdAt: true, subtotalCents: true, pointsEarned: true, itemsJson: true },
  });

  return NextResponse.json({ ok: true, orders });
}
