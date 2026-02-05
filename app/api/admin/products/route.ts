import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ✅ Prisma precisa de Node (não Edge)

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
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

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, products });
  } catch (err: any) {
    console.error("GET /api/admin/products error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao buscar produtos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

    const kind = normalizeString(body?.kind || "ACAI").toUpperCase() || "ACAI";
    const category = normalizeString(body?.category || "outros").toLowerCase();
    const title = normalizeString(body?.title);
    const description = body?.description ? normalizeString(body.description) : null;
    const imageUrl = body?.imageUrl ? normalizeString(body.imageUrl) : null;
    const isActive = body?.isActive === false ? false : true;

    if (!category || !title) {
      return NextResponse.json({ ok: false, error: "category e title são obrigatórios" }, { status: 400 });
    }

    // ---- basePrice ----
    const basePriceCents =
      body?.basePriceCents !== undefined
        ? Math.max(0, toInt(body.basePriceCents, 0))
        : body?.basePriceReais !== undefined
        ? reaisToCents(body.basePriceReais, 0)
        : 0;

    // ---- variants ----
    const variantsInput: Array<{ label: string; priceCents: number; sortOrder: number }> = Array.isArray(body?.variants)
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

    // ---- choices ----
    const choicesInput: Array<{ name: string; sortOrder: number }> =
      kind === "COPO" && Array.isArray(body?.choices)
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

    // ===== Regras por kind
    if (kind === "SIMPLE") {
      if (basePriceCents <= 0) {
        return NextResponse.json(
          { ok: false, error: "Para SIMPLE (pudim/doces), informe basePriceCents ou basePriceReais." },
          { status: 400 }
        );
      }
    } else {
      if (variantsInput.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Para ACAI/COPO, informe variantes válidas (label + preço > 0)." },
          { status: 400 }
        );
      }
    }

    const created = await prisma.product.create({
      data: {
        kind,
        category,
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

        choices:
          kind === "COPO" && choicesInput.length
            ? {
                create: choicesInput.map((c) => ({
                  name: c.name,
                  sortOrder: c.sortOrder,
                  isActive: true,
                })),
              }
            : undefined,
      },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, product: created }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/products error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao criar produto" }, { status: 500 });
  }
}
