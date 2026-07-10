import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientClass } from "@/lib/server/work";

/**
 * Gestión de una clase por su profesor dueño:
 *  - PATCH { removeStudent } → quita a un alumno de la clase.
 *  - DELETE                  → elimina la clase (y en cascada sus tareas
 *    y entregas).
 */

async function ownedClass(id: string, teacherEmail: string) {
  const cls = await prisma.classRoom.findUnique({ where: { id } });
  if (!cls) return { error: "La clase no existe.", status: 404 as const };
  if (cls.teacherEmail !== teacherEmail) {
    return { error: "Esta clase no es tuya.", status: 403 as const };
  }
  return { cls };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "profesor" || !session.user.email) {
    return NextResponse.json({ error: "Solo profesores." }, { status: 403 });
  }
  const { id } = await params;
  const owned = await ownedClass(id, session.user.email);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const { removeStudent } = (await request.json()) as { removeStudent?: string };
  if (!removeStudent) {
    return NextResponse.json({ error: "Falta el alumno a quitar." }, { status: 400 });
  }
  const students = (JSON.parse(owned.cls.studentsJson) as string[]).filter(
    (e) => e !== removeStudent
  );
  const updated = await prisma.classRoom.update({
    where: { id },
    data: { studentsJson: JSON.stringify(students) },
  });
  return NextResponse.json(toClientClass(updated));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "profesor" || !session.user.email) {
    return NextResponse.json({ error: "Solo profesores." }, { status: 403 });
  }
  const { id } = await params;
  const owned = await ownedClass(id, session.user.email);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  await prisma.classRoom.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
