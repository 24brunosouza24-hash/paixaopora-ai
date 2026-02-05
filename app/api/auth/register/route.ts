import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "../../../../lib/db";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = (body.name ?? "").toString().trim();
    const phoneRaw = (body.phone ?? "").toString();
    const password = (body.password ?? "").toString();
    const addressLine = (body.addressLine ?? "").toString().trim();
    const reference = (body.reference ?? "").toString().trim();

    const phone = normalizePhone(phoneRaw);

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Senha muito curta (mínimo 4)." }, { status: 400 });
    }
    if (!addressLine) {
      return NextResponse.json({ error: "Endereço é obrigatório." }, { status: 400 });
    }
    if (!reference) {
      return NextResponse.json({ error: "Ponto de referência é obrigatório." }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) {
      return NextResponse.json({ error: "Esse telefone já está cadastrado." }, { status: 409 });
    }

    const passHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name: name || null, phone, passHash, addressLine, reference },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("REGISTER_ERROR:", e);
    return NextResponse.json(
      { error: "Erro interno no cadastro.", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
