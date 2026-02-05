import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const row =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  return NextResponse.json({ ok: true, isOpen: row.isOpen });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const isOpen = !!body?.isOpen;

  const row = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, isOpen },
    update: { isOpen },
  });

  return NextResponse.json({ ok: true, isOpen: row.isOpen });
}
