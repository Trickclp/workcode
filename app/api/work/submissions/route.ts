import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientSubmission } from "@/lib/server/work";
import type { Submission } from "@/lib/state/work";

/**
 * Registra una entrega. El correo del alumno y la fecha se derivan de
 * la sesión en el servidor (no se confía en el cliente para la
 * identidad). El puntaje llega calculado por el auto-evaluador del
 * cliente; recalcularlo server-side es el siguiente endurecimiento
 * natural cuando el motor remoto sea autoalojado.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as Omit<Submission, "id" | "submittedAt" | "studentEmail">;
  if (!body.assignmentId || typeof body.code !== "string") {
    return NextResponse.json({ error: "Faltan campos de la entrega." }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: body.assignmentId },
    include: { class: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "La tarea no existe." }, { status: 404 });
  }

  // Solo entregan los alumnos inscritos en la clase (o su profesor,
  // para probar la tarea antes de publicar el código de clase).
  const students = JSON.parse(assignment.class.studentsJson) as string[];
  const email = session.user.email;
  if (!students.includes(email) && assignment.class.teacherEmail !== email) {
    return NextResponse.json(
      { error: "No estás inscrito en la clase de esta tarea. Únete con el código de clase." },
      { status: 403 }
    );
  }

  const created = await prisma.submission.create({
    data: {
      assignmentId: body.assignmentId,
      studentEmail: session.user.email,
      code: body.code,
      passed: body.passed ?? 0,
      total: body.total ?? 0,
      score: body.score,
      status: body.status ?? "auto",
      isLate: body.isLate ?? false,
      penaltyApplied: body.penaltyApplied ?? 0,
      outcomesJson: JSON.stringify(body.outcomes ?? []),
    },
  });

  return NextResponse.json(toClientSubmission(created));
}
