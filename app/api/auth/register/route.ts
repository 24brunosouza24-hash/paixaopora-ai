import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const phone = normalizePhone(body?.phone);
    const password = String(body?.password || "");

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: "Preencha nome, telefone e senha." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "Esse telefone já está cadastrado." }, { status: 409 });
    }

    const passHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passHash,
        points: 0,
      },
      select: { id: true, name: true, phone: true, points: true },
    });

    const res = NextResponse.json({ ok: true, user });

    // opcional: já deixa logado depois do cadastro
    res.cookies.set("uid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    return NextResponse.json({ error: "Erro interno no cadastro." }, { status: 500 });
  }
}
