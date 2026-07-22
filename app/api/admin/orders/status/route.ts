import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, status } = body;

    if (!id || !status) {
      return Response.json(
        { ok: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id },
      data: {
        status,
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);

    return Response.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = String(body?.id || "").trim();

    if (!id) {
      return Response.json({ ok: false, error: "Pedido invalido" }, { status: 400 });
    }

    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir pedido:", err);
    return Response.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
