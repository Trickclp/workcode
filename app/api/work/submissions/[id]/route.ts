import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientSubmission } from "@/lib/server/work";

/**
 * Calificación manual del profesor para entregas de tareas sin casos
 * de prueba (status "pendiente"). Valida que la tarea pertenezca a una
 * clase del profesor y que la nota esté dentro de la escala.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "profesor") {
    return NextResponse.json({ error: "Solo profesores pueden calificar." }, { status: 403 });
  }

  const { id } = await params;
  const { score } = (await request.json()) as { score?: number };

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { assignment: { include: { class: true } } },
  });
  if (!submission) {
    return NextResponse.json({ error: "La entrega no existe." }, { status: 404 });
  }
  if (submission.assignment.class.teacherEmail !== session.user.email) {
    return NextResponse.json({ error: "Esta entrega no pertenece a tus clases." }, { status: 403 });
  }

  const scale = JSON.parse(submission.assignment.scaleJson) as { min: number; max: number };
  if (typeof score !== "number" || Number.isNaN(score) || score < scale.min || score > scale.max) {
    return NextResponse.json(
      { error: `La nota debe estar entre ${scale.min} y ${scale.max}.` },
      { status: 400 }
    );
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: { score: Math.round(score * 10) / 10, status: "manual" },
  });

  return NextResponse.json(toClientSubmission(updated));
}
