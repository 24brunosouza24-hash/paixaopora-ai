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
    return NextResponse.json({ ok: false, error: "N?o autorizado" }, { status: 401 });
  }
  return null;
}

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function reaisToCents(v: any, fallback = 0) {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100));
}

function normalizeString(v: any) {
  return String(v ?? "").trim();
}

function parseVariants(body: any) {
  return Array.isArray(body?.variants)
    ? body.variants
        .map((v: any, idx: number) => {
          const label = normalizeString(v?.label);
          if (!label) return null;
          const sortOrder = v?.sortOrder !== undefined ? Math.max(0, toInt(v.sortOrder, idx)) : idx;
          const priceCents =
            v?.priceCents !== undefined
              ? Math.max(0, toInt(v.priceCents, 0))
              : v?.priceReais !== undefined
              ? reaisToCents(v.priceReais, 0)
              : 0;
          if (priceCents <= 0) return null;
          return { label, priceCents, sortOrder };
        })
        .filter(Boolean)
    : [];
}

function parseChoices(body: any) {
  return Array.isArray(body?.choices)
    ? body.choices
        .map((c: any, idx: number) => {
          if (typeof c === "string") {
            const name = normalizeString(c);
            if (!name) return null;
            return { name, sortOrder: idx };
          }
          const name = normalizeString(c?.name);
          if (!name) return null;
          const sortOrder = c?.sortOrder !== undefined ? Math.max(0, toInt(c.sortOrder, idx)) : idx;
          return { name, sortOrder };
        })
        .filter(Boolean)
    : [];
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await context.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return NextResponse.json({ ok: false, error: "ID inv?lido" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "JSON inv?lido" }, { status: 400 });

    const fullEdit = body.title !== undefined || body.category !== undefined || body.kind !== undefined;

    if (!fullEdit) {
      const updated = await prisma.product.update({
        where: { id: cleanId },
        data: { isActive: body?.isActive === false ? false : true },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          choices: { orderBy: { sortOrder: "asc" } },
        },
      });
      return NextResponse.json({ ok: true, product: updated });
    }

    const kind = normalizeString(body?.kind || "ACAI").toUpperCase() || "ACAI";
    const category = normalizeString(body?.category || "outros").toLowerCase();
    const categoryTitle = body?.categoryTitle ? normalizeString(body.categoryTitle) : null;
    const title = normalizeString(body?.title);
    const description = body?.description ? normalizeString(body.description) : null;
    const imageUrl = body?.imageUrl ? normalizeString(body.imageUrl) : null;
    const isActive = body?.isActive === false ? false : true;
    const basePriceCents =
      body?.basePriceCents !== undefined
        ? Math.max(0, toInt(body.basePriceCents, 0))
        : body?.basePriceReais !== undefined
        ? reaisToCents(body.basePriceReais, 0)
        : 0;
    const variantsInput = parseVariants(body) as Array<{ label: string; priceCents: number; sortOrder: number }>;
    const choicesInput = parseChoices(body) as Array<{ name: string; sortOrder: number }>;

    if (!category || !title) {
      return NextResponse.json({ ok: false, error: "Categoria e nome s?o obrigat?rios" }, { status: 400 });
    }

    if (kind === "SIMPLE") {
      if (basePriceCents <= 0) {
        return NextResponse.json({ ok: false, error: "Informe um pre?o v?lido." }, { status: 400 });
      }
    } else if (variantsInput.length === 0) {
      return NextResponse.json({ ok: false, error: "Informe tamanho/pre?o v?lido." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.variant.deleteMany({ where: { productId: cleanId } });
      await tx.productChoice.deleteMany({ where: { productId: cleanId } });

      await tx.product.update({
        where: { id: cleanId },
        data: {
          kind,
          category,
          categoryTitle,
          title,
          description,
          imageUrl,
          isActive,
          basePriceCents: kind === "SIMPLE" ? basePriceCents : 0,
          variants:
            kind === "SIMPLE"
              ? undefined
              : {
                  create: variantsInput.map((v) => ({
                    label: v.label,
                    priceCents: v.priceCents,
                    sortOrder: v.sortOrder,
                  })),
                },
          choices: choicesInput.length
            ? {
                create: choicesInput.map((c) => ({
                  name: c.name,
                  sortOrder: c.sortOrder,
                  isActive: true,
                })),
              }
            : undefined,
        },
      });
    });

    const updated = await prisma.product.findUnique({
      where: { id: cleanId },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (err: any) {
    console.error("PATCH product error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao atualizar produto" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await context.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return NextResponse.json({ ok: false, error: "ID inv?lido" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id: cleanId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE product error:", err);
    const msg = String(err?.message || "");
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      return NextResponse.json({ ok: false, error: "Produto j? usado em pedidos. N?o pode excluir." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao excluir produto" }, { status: 500 });
  }
}
