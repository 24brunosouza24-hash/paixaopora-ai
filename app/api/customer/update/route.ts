import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acai_point_session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function pickString(v: any) {
  return typeof v === "string" ? v.trim() : "";
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

    const name = pickString(body.name);

    // aceita os dois jeitos:
    const neighborhood = pickString(body.bairro || body.neighborhood);
    const street = pickString(body.rua || body.street);
    const addressLine = pickString(body.numero || body.addressLine);
    const reference = pickString(body.referencia || body.reference);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        neighborhood: neighborhood || null,
        street: street || null,
        addressLine: addressLine || null,
        reference: reference || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao salvar cadastro", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
