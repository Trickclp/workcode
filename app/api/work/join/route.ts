import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientClass } from "@/lib/server/work";

/**
 * Inscripción de un alumno a una clase mediante el código que comparte
 * el profesor (ej: PROG1-2026). Idempotente: unirse dos veces no
 * duplica.
 */
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "alumno") {
    return NextResponse.json(
      { error: "Solo los alumnos se inscriben con código. Los profesores crean sus clases." },
      { status: 403 }
    );
  }

  const { code } = (await request.json()) as { code?: string };
  const cleanCode = (code ?? "").trim().toUpperCase();
  if (!cleanCode) {
    return NextResponse.json({ error: "Ingresa el código de la clase." }, { status: 400 });
  }

  const cls = await prisma.classRoom.findUnique({ where: { code: cleanCode } });
  if (!cls) {
    return NextResponse.json(
      { error: `No existe ninguna clase con el código "${cleanCode}".` },
      { status: 404 }
    );
  }

  const students = JSON.parse(cls.studentsJson) as string[];
  if (!students.includes(email)) {
    students.push(email);
    await prisma.classRoom.update({
      where: { id: cls.id },
      data: { studentsJson: JSON.stringify(students) },
    });
  }

  const client = toClientClass({ ...cls, studentsJson: JSON.stringify(students) });
  return NextResponse.json({ ...client, students: [email] });
}
