import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminCookieName, signAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = (body.password ?? "").toString();

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: "ADMIN_PASSWORD não configurado" }, { status: 500 });
    }

    if (password !== expected) {
      return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
    }

    const token = signAdminToken();
    const res = NextResponse.json({ ok: true });

    const cookieStore = await cookies();
    cookieStore.set(getAdminCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false, // em produção com https: true
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e) {
    console.error("ADMIN_LOGIN_ERROR:", e);
    return NextResponse.json({ error: "Erro interno no login admin" }, { status: 500 });
  }
}
