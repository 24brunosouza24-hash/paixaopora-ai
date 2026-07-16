import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get("days") || 7);

  const totalDays = [7, 15, 30].includes(daysParam) ? daysParam : 7;

  const today = startOfDay(new Date());
  const days = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const nextDay = addDays(day, 1);

    const result = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: day,
          lt: nextDay,
        },
      },
      _sum: {
        totalCents: true,
      },
      _count: true,
    });

    days.push({
      label: formatDay(day),
      totalCents: result._sum.totalCents ?? 0,
      ordersCount: result._count,
    });
  }

  return NextResponse.json(days);
}