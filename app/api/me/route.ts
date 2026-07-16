import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const tokenHash = sha256(token);

    const session = await prisma.userSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

    const u = session.user;

    return NextResponse.json({
      ok: true,
      user: {
        id: u.id,
        phone: u.phone,
        points: u.points,

        name: u.name,
        neighborhood: u.neighborhood,
        street: u.street,
        addressLine: u.addressLine,
        reference: u.reference,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro no /api/me", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
