import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminCookieName, verifyAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!token || !verifyAdminToken(token)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const nextOpen = !!body?.isOpen;

  const row =
    (await prisma.storeSettings.findUnique({ where: { id: 1 } })) ||
    (await prisma.storeSettings.create({ data: { id: 1, isOpen: true } }));

  const updated = await prisma.storeSettings.update({
    where: { id: 1 },
    data: { isOpen: nextOpen },
  });

  return Response.json({ ok: true, isOpen: updated.isOpen });
}
