import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.orderItem.findMany({
    select: {
      title: true,
      qty: true,
    },
  });

  const map = new Map<string, number>();

  for (const item of items) {
    const current = map.get(item.title) || 0;
    map.set(item.title, current + item.qty);
  }

  const result = Array.from(map.entries())
    .map(([title, qty]) => ({
      title,
      qty,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return NextResponse.json(result);
}