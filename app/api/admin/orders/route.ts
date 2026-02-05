import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ✅ garante Prisma no Node (não Edge)

export async function GET() {
  try {
    // Se o Prisma Client estiver desatualizado, prisma.order pode não existir.
    // Isso evita "undefined is not a function" e te dá um erro mais claro.
    if (!(prisma as any)?.order?.findMany) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Prisma Client desatualizado (prisma.order não existe). Rode: npx prisma generate e reinicie o servidor.",
        },
        { status: 500 }
      );
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 200,
    });

    return NextResponse.json({ ok: true, orders });
  } catch (err: any) {
    console.error("GET /api/admin/orders error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao buscar pedidos" },
      { status: 500 }
    );
  }
}
