import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });
    }

    const tokenHash = sha256(token);

    const session = await prisma.userSession.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Sessao invalida" }, { status: 401 });
    }

    const bankPoints = Number(session.user.points || 0);
    const user = {
      id: session.user.id,
      name: session.user.name,
      phone: session.user.phone,
      neighborhood: session.user.neighborhood,
      street: session.user.street,
      addressLine: session.user.addressLine,
      reference: session.user.reference,
      points: bankPoints,
    };

    return NextResponse.json({
      ok: true,
      user,
      points: user.points,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao sincronizar pontos", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
