import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientAssignment } from "@/lib/server/work";
import type { Assignment } from "@/lib/state/work";

/** Publica una tarea (solo profesores, en una clase propia). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "profesor") {
    return NextResponse.json({ error: "Solo profesores pueden crear tareas." }, { status: 403 });
  }

  const body = (await request.json()) as Omit<Assignment, "id">;
  if (!body.classId || !body.title?.trim() || !body.language) {
    return NextResponse.json({ error: "Faltan campos de la tarea." }, { status: 400 });
  }

  const cls = await prisma.classRoom.findUnique({ where: { id: body.classId } });
  if (!cls || cls.teacherEmail !== session.user.email) {
    return NextResponse.json({ error: "La clase no existe o no es tuya." }, { status: 403 });
  }

  const created = await prisma.assignment.create({
    data: {
      classId: body.classId,
      title: body.title.trim(),
      instructions: body.instructions ?? "",
      language: body.language,
      testCasesJson: JSON.stringify(body.testCases ?? []),
      dueDate: body.dueDate,
      scaleJson: JSON.stringify(body.gradeScale),
      weight: body.weight ?? 0,
      latePolicyJson: JSON.stringify(body.latePolicy),
    },
  });

  return NextResponse.json(toClientAssignment(created));
}
