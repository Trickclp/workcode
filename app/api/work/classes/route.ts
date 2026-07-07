import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientClass } from "@/lib/server/work";

/** Crea una clase (solo profesores). El código de acceso se genera aquí. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "profesor") {
    return NextResponse.json({ error: "Solo profesores pueden crear clases." }, { status: 403 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nombre de clase requerido." }, { status: 400 });
  }

  const code = `${name.replace(/\W+/g, "").toUpperCase().slice(0, 6)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const created = await prisma.classRoom.create({
    data: {
      name: name.trim(),
      code,
      teacherEmail: session.user.email,
      studentsJson: "[]",
    },
  });

  return NextResponse.json(toClientClass(created));
}
