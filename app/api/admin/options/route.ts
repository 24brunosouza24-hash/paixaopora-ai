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

  const type = String(body.type || "").trim();
  const name = String(body.name || "").trim();

  // ✅ pode vir em REAIS (ex: 2.5) OU em centavos (ex: 250)
  const priceReaisRaw = body.priceReais;
  const priceCentsRaw = body.priceCents;

  let priceCents = 0;

  if (priceReaisRaw !== undefined && priceReaisRaw !== null && priceReaisRaw !== "") {
    const pr = Number(priceReaisRaw);
    if (!Number.isFinite(pr)) {
      return NextResponse.json({ error: "Preço (reais) inválido" }, { status: 400 });
    }
    priceCents = Math.round(pr * 100);
  } else {
    const pc = Number(priceCentsRaw ?? 0);
    if (!Number.isFinite(pc)) {
      return NextResponse.json({ error: "Preço (centavos) inválido" }, { status: 400 });
    }
    priceCents = Math.round(pc);
  }

  const sortOrder = Math.max(0, Math.round(Number(body.sortOrder || 0)));

  if (!type || !name) {
    return NextResponse.json({ error: "type e name são obrigatórios" }, { status: 400 });
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

// ✅ Toggle ativar/desativar (resolve seu botão "Desativar")
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const found = await prisma.optionItem.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Extra não encontrado" }, { status: 404 });

  const updated = await prisma.optionItem.update({
    where: { id },
    data: { isActive: !found.isActive },
  });

  return NextResponse.json({ ok: true, item: updated });
}
// 🗑️ EXCLUIR extra (apaga de vez)
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const found = await prisma.optionItem.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Extra não encontrado" }, { status: 404 });

  await prisma.optionItem.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
