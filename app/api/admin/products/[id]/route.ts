import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await context.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const updated = await prisma.product.update({
      where: { id: cleanId },
      data: { isActive: body?.isActive === false ? false : true },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (err: any) {
    console.error("PATCH product error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await context.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: cleanId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE product error:", err);

    const msg = String(err?.message || "");
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      return NextResponse.json(
        { ok: false, error: "Produto já usado em pedidos. Não pode excluir." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao excluir produto" },
      { status: 500 }
    );
  }
}
