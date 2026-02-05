import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // ✅ AGORA TEM QUE AWAIT

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
