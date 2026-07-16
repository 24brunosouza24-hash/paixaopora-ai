import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST() {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfDay(now),
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
    } else {
      cash += order.totalCents;
    }
  }

  const closing = await prisma.cashClosing.create({
    data: {
      totalCents,
      ordersCount: orders.length,
      cashCents: cash,
      pixCents: pix,
      cardCents: card,
    },
  });

  return NextResponse.json(closing);
}