import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return Boolean(token && verifyAdminToken(token));
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const row =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  return Response.json({
    ok: true,
    isOpen: row.isOpen,
    openHours: row.openHours || "18h as 23h30",
    promotionText: row.promotionText || "",
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const data: { isOpen?: boolean; openHours?: string; promotionText?: string | null } = {};

  if (typeof body?.isOpen === "boolean") data.isOpen = body.isOpen;
  if (body?.openHours !== undefined) data.openHours = String(body.openHours || "").trim() || "18h as 23h30";
  if (body?.promotionText !== undefined) data.promotionText = String(body.promotionText || "").trim() || null;

  const updated = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      isOpen: data.isOpen ?? true,
      openHours: data.openHours ?? "18h as 23h30",
      promotionText: data.promotionText ?? null,
    },
    update: data,
  });

  return Response.json({
    ok: true,
    isOpen: updated.isOpen,
    openHours: updated.openHours || "18h as 23h30",
    promotionText: updated.promotionText || "",
  });
}
