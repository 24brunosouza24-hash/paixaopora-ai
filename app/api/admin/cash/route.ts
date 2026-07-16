import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function sumOrders(from: Date) {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: from,
      },
    },
    select: {
      totalCents: true,
      payment: true,
    },
  });

  let totalCents = 0;
  let cash = 0;
  let pix = 0;
  let card = 0;

  for (const order of orders) {
    totalCents += order.totalCents;

    
    const method = (order.payment || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

if (
  method.includes("cartao") ||
  method.includes("credito") ||
  method.includes("debito") ||
  method.includes("card")
) {
  card += order.totalCents;
} else if (method.includes("pix")) {
  pix += order.totalCents;
} else if (
  method.includes("dinheiro") ||
  method.includes("cash")
) {
  cash += order.totalCents;
}
  }

  return {
    totalCents,
    ordersCount: orders.length,
    byPayment: {
      cash,
      pix,
      card,
    },
  };
}

export async function GET() {
  const now = new Date();

  const today = await sumOrders(startOfDay(now));
  const week = await sumOrders(startOfWeek(now));
  const month = await sumOrders(startOfMonth(now));

  return NextResponse.json({
    today,
    week,
    month,
  });
}