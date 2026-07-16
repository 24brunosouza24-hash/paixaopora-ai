import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return null;
}

function moneyToCents(value: unknown) {
  const raw = String(value ?? "0").trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const amount = Number(normalized || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const items = await prisma.optionItem.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  const type = String(body.type || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const sortOrder = Math.max(0, Math.round(Number(body.sortOrder || 0)));

  if (!type || !name) {
    return NextResponse.json({ error: "Tipo e nome são obrigatórios" }, { status: 400 });
  }

  let priceCents = 0;
  if (body.priceReais !== undefined && body.priceReais !== null && body.priceReais !== "") {
    const cents = moneyToCents(body.priceReais);
    if (cents === null) {
      return NextResponse.json({ error: "Preço inválido. Use 3,50 ou 3.50." }, { status: 400 });
    }
    priceCents = cents;
  } else if (body.priceCents !== undefined && body.priceCents !== null && body.priceCents !== "") {
    const cents = Number(body.priceCents);
    if (!Number.isFinite(cents)) {
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
    }
    priceCents = Math.round(cents);
  }

  const created = await prisma.optionItem.create({
    data: {
      type,
      name,
      priceCents: Math.max(0, priceCents),
      sortOrder,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const found = await prisma.optionItem.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  const updated = await prisma.optionItem.update({
    where: { id },
    data: { isActive: !found.isActive },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const found = await prisma.optionItem.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  await prisma.optionItem.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
