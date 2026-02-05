import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

export async function POST(_: Request, ctx: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = ctx.params.id;

  const item = await prisma.optionItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const updated = await prisma.optionItem.update({
    where: { id },
    data: { isActive: !item.isActive },
  });

  return NextResponse.json({ ok: true, item: updated });
}
