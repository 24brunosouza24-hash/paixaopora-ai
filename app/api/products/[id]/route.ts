import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
      choices: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true, product });
}
