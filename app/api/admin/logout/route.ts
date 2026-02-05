import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminCookieName } from "@/lib/adminAuth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(getAdminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
