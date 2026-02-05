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

function toCents(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const category = String(body.category || "outros").trim().toLowerCase();
  const title = String(body.title || "").trim();
  const description = body.description ? String(body.description) : null;
  const imageUrl = body.imageUrl ? String(body.imageUrl) : null;

  const kind = String(body.kind || "ACAI").trim().toUpperCase(); // ACAI | COPO | SIMPLE
  const variantsRaw = Array.isArray(body.variants) ? body.variants : [];
  const choicesRaw = Array.isArray(body.choices) ? body.choices : []; // sabores (COPO)

  if (!title) return NextResponse.json({ ok: false, error: "Título é obrigatório" }, { status: 400 });

  // ===== SIMPLE -> basePriceReais obrigatório
  let basePriceCents = 0;

  if (kind === "SIMPLE") {
    basePriceCents = toCents(body.basePriceReais);
    if (basePriceCents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido. Para Pudim/Doces (SIMPLE), envie basePriceReais." },
        { status: 400 }
      );
    }
  }

  // ===== Variantes (ACAI/COPO)
  const variants =
    kind === "SIMPLE"
      ? []
      : variantsRaw
          .map((v: any) => ({
            label: String(v?.label || "").trim(),
            priceCents: toCents(v?.priceReais),
            sortOrder: Math.max(0, Number(v?.sortOrder || 0) | 0),
          }))
          .filter((v: any) => v.label && v.priceCents > 0);

  if (kind !== "SIMPLE" && variants.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Esse produto precisa de variantes válidas (label + preço > 0)." },
      { status: 400 }
    );
  }

  // ===== Choices (somente COPO)
  const choices =
    kind === "COPO"
      ? choicesRaw
          .map((c: any) => String(c || "").trim())
          .filter(Boolean)
          .map((name: string, i: number) => ({ name, sortOrder: i }))
      : [];

  try {
    const product = await prisma.product.create({
      data: {
        category,
        title,
        description,
        imageUrl,
        isActive: true,
        kind,
        basePriceCents,

        variants:
          kind === "SIMPLE"
            ? undefined
            : {
                create: variants.map((v: any) => ({
                  label: v.label,
                  priceCents: v.priceCents,
                  sortOrder: v.sortOrder,
                })),
              },

        choices:
          kind === "COPO"
            ? {
                create: choices,
              }
            : undefined,
      },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    console.error("POST /api/admin/products/create error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
