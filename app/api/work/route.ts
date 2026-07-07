import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientAssignment, toClientClass, toClientSubmission } from "@/lib/server/work";

/**
 * Estado del módulo Work para el usuario autenticado, filtrado por rol
 * EN EL SERVIDOR (privacidad real):
 *
 *  - profesor: sus clases, las tareas de esas clases y TODAS las
 *    entregas de sus tareas (para métricas y calificación).
 *  - alumno: las clases donde está inscrito, sus tareas y SOLO sus
 *    propias entregas. La lista de compañeros no se expone.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  const role = session?.user?.role;
  if (!email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const allClasses = await prisma.classRoom.findMany();
  const myClasses =
    role === "profesor"
      ? allClasses.filter((c) => c.teacherEmail === email)
      : allClasses.filter((c) => (JSON.parse(c.studentsJson) as string[]).includes(email));

  const classIds = myClasses.map((c) => c.id);
  const assignments = await prisma.assignment.findMany({
    where: { classId: { in: classIds } },
  });
  const assignmentIds = assignments.map((a) => a.id);

  const submissions = await prisma.submission.findMany({
    where:
      role === "profesor"
        ? { assignmentId: { in: assignmentIds } }
        : { assignmentId: { in: assignmentIds }, studentEmail: email },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json({
    classes: myClasses.map((row) => {
      const cls = toClientClass(row);
      // El alumno no ve los correos de sus compañeros.
      return role === "profesor" ? cls : { ...cls, students: [email] };
    }),
    assignments: assignments.map(toClientAssignment),
    submissions: submissions.map(toClientSubmission),
  });
}
