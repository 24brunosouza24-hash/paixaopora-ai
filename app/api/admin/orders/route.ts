import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function asInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(200, Math.max(1, asInt(searchParams.get("take"), 50)));

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take,
    });

    return NextResponse.json({ ok: true, orders });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao buscar pedidos" },
      { status: 500 }
    );
  }
}
