import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Actualiza el rol del usuario autenticado (onboarding de Google y
 * Dev Toggle). El cliente luego refresca su sesión con update({role}).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { role } = (await request.json()) as { role?: string };
  if (role !== "alumno" && role !== "profesor") {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}
