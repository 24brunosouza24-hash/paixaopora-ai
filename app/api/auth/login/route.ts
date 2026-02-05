import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone((body.phone ?? "").toString());
    const password = (body.password ?? "").toString();

    if (!phone || !password) {
      return NextResponse.json({ error: "Preencha telefone e senha." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ error: "Telefone ou senha inválidos." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passHash);
    if (!ok) {
      return NextResponse.json({ error: "Telefone ou senha inválidos." }, { status: 401 });
    }

    // cookie simples: guarda o id do usuário (depois a gente melhora para JWT)
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, phone: user.phone, points: user.points },
    });

    res.cookies.set("uid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Erro interno no login." }, { status: 500 });
  }
}
