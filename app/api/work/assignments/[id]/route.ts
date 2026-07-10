import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientAssignment } from "@/lib/server/work";
import type { Assignment } from "@/lib/state/work";

/** Comprueba que la tarea exista y pertenezca a una clase del profesor. */
async function ownedAssignment(id: string, teacherEmail: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!assignment) return { error: "La tarea no existe.", status: 404 as const };
  if (assignment.class.teacherEmail !== teacherEmail) {
    return { error: "Esta tarea no pertenece a tus clases.", status: 403 as const };
  }
  return { assignment };
}

/** Editar una tarea (profesor dueño). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "profesor" || !session.user.email) {
    return NextResponse.json({ error: "Solo profesores." }, { status: 403 });
  }
  const { id } = await params;
  const owned = await ownedAssignment(id, session.user.email);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const body = (await request.json()) as Partial<Omit<Assignment, "id" | "classId">>;
  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.instructions !== undefined ? { instructions: body.instructions } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.testCases !== undefined ? { testCasesJson: JSON.stringify(body.testCases) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      ...(body.gradeScale !== undefined ? { scaleJson: JSON.stringify(body.gradeScale) } : {}),
      ...(body.weight !== undefined ? { weight: body.weight } : {}),
      ...(body.latePolicy !== undefined ? { latePolicyJson: JSON.stringify(body.latePolicy) } : {}),
    },
  });
  return NextResponse.json(toClientAssignment(updated));
}

/** Eliminar una tarea y todas sus entregas (profesor dueño). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "profesor" || !session.user.email) {
    return NextResponse.json({ error: "Solo profesores." }, { status: 403 });
  }
  const { id } = await params;
  const owned = await ownedAssignment(id, session.user.email);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  await prisma.assignment.delete({ where: { id } }); // Cascade borra sus entregas.
  return NextResponse.json({ ok: true });
}
