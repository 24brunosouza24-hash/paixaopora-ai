import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await context.params;
  const cleanId = String(id || "").trim();
  if (!cleanId) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const current = await prisma.optionItem.findUnique({ where: { id: cleanId } });
  if (!current) {
    return NextResponse.json({ ok: false, error: "Opção não encontrada" }, { status: 404 });
  }

  const updated = await prisma.optionItem.update({
    where: { id: cleanId },
    data: { isActive: !current.isActive },
  });

  return NextResponse.json({ ok: true, item: updated });
}
