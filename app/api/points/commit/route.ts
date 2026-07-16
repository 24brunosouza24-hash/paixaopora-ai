import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const tokenHash = sha256(token);

    const session = await prisma.userSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!session?.user) return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const usedPoints = Number(body?.usedPoints || 0);
    const earnedPoints = Number(body?.earnedPoints || 0);

    if (!Number.isFinite(usedPoints) || !Number.isFinite(earnedPoints)) {
      return NextResponse.json({ ok: false, error: "Valores inválidos" }, { status: 400 });
    }

    const nextPoints = Math.max(0, session.user.points - Math.max(0, usedPoints)) + Math.max(0, earnedPoints);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { points: nextPoints },
      select: { points: true },
    });

    return NextResponse.json({ ok: true, points: updated.points });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar pontos", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
