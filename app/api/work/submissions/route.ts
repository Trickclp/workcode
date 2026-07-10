import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeOnServer } from "@/lib/server/grade";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { toClientSubmission } from "@/lib/server/work";
import type { RuntimeId } from "@/lib/runtimes/types";
import type { GradeScale } from "@/lib/grading";
import type { LatePolicy, TestCase } from "@/lib/state/work";

/**
 * Registra una entrega. La identidad del alumno y la fecha vienen de la
 * sesión (no se confía en el cliente). Para tareas con casos de prueba,
 * el PUNTAJE SE CALCULA EN EL SERVIDOR ejecutando el código: el cliente
 * solo envía el código, nunca la nota. Sin casos, queda pendiente de
 * revisión manual.
 */
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // Calificar ejecuta código en el motor remoto: se limita el ritmo.
  const limit = rateLimit(`submit:${email}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas entregas seguidas. Espera ${limit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const body = (await request.json()) as { assignmentId?: string; code?: string };
  if (!body.assignmentId || typeof body.code !== "string") {
    return NextResponse.json({ error: "Faltan campos de la entrega." }, { status: 400 });
  }
  if (body.code.length > 100_000) {
    return NextResponse.json({ error: "El código excede el límite permitido." }, { status: 413 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: body.assignmentId },
    include: { class: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "La tarea no existe." }, { status: 404 });
  }

  const students = JSON.parse(assignment.class.studentsJson) as string[];
  if (!students.includes(email) && assignment.class.teacherEmail !== email) {
    return NextResponse.json(
      { error: "No estás inscrito en la clase de esta tarea. Únete con el código de clase." },
      { status: 403 }
    );
  }

  const testCases = JSON.parse(assignment.testCasesJson) as TestCase[];
  const scale = JSON.parse(assignment.scaleJson) as GradeScale;
  const latePolicy = JSON.parse(assignment.latePolicyJson) as LatePolicy;

  // Bloquea entregas atrasadas si la tarea no las acepta.
  const nowLate = Date.now() > new Date(`${assignment.dueDate}T23:59:59`).getTime();
  if (nowLate && !latePolicy.acceptLate) {
    return NextResponse.json(
      { error: "El plazo venció y esta tarea no acepta entregas atrasadas." },
      { status: 403 }
    );
  }

  // Sin casos → revisión manual (no se ejecuta nada).
  if (testCases.length === 0) {
    const created = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        studentEmail: email,
        code: body.code,
        passed: 0,
        total: 0,
        score: null,
        status: "pendiente",
        isLate: nowLate,
        penaltyApplied: 0,
        outcomesJson: "[]",
      },
    });
    return NextResponse.json(toClientSubmission(created));
  }

  // Con casos → calificación autoritativa en el servidor.
  try {
    const result = await gradeOnServer(
      assignment.language as RuntimeId,
      body.code,
      testCases,
      scale,
      assignment.dueDate,
      latePolicy.penaltyPercent,
      latePolicy.acceptLate
    );

    const created = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        studentEmail: email,
        code: body.code,
        passed: result.passed,
        total: result.total,
        score: result.score,
        status: "auto",
        isLate: result.isLate,
        penaltyApplied: result.penaltyApplied,
        outcomesJson: JSON.stringify(result.outcomes),
      },
    });
    return NextResponse.json(toClientSubmission(created));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "No se pudo evaluar tu código en el servidor en este momento (motor de ejecución no disponible). Tu entrega NO fue registrada; intenta de nuevo en un momento.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
