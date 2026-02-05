import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.optionItem.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, type: true, name: true, priceCents: true },
  });

  return NextResponse.json({ ok: true, items });
}
