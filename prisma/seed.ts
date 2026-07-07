/**
 * Datos semilla de Work.Code (npx prisma db seed).
 * Crea la clase demo con sus tareas y dos entregas de ejemplo para
 * que Métricas y Calificaciones tengan contenido desde el primer uso.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_TEACHER = "tomyfortnite5@gmail.com";
const SCALE_CL = JSON.stringify({ min: 1, max: 7, passing: 4 });
const SCALE_PCT = JSON.stringify({ min: 0, max: 100, passing: 60 });

async function main() {
  // Cuenta demo del profesor (correo/contraseña: workcode123).
  await prisma.user.upsert({
    where: { email: DEMO_TEACHER },
    update: {},
    create: {
      name: "Tomy",
      email: DEMO_TEACHER,
      passwordHash: await bcrypt.hash("workcode123", 10),
      role: "profesor",
      provider: "password",
    },
  });

  const cls = await prisma.classRoom.upsert({
    where: { code: "PROG1-2026" },
    update: {},
    create: {
      id: "c-prog1",
      name: "Programación I",
      code: "PROG1-2026",
      teacherEmail: DEMO_TEACHER,
      studentsJson: JSON.stringify([
        DEMO_TEACHER,
        "ana.garcia@demo.edu",
        "luis.perez@demo.edu",
      ]),
    },
  });

  const existing = await prisma.assignment.count({ where: { classId: cls.id } });
  if (existing > 0) return;

  const suma = await prisma.assignment.create({
    data: {
      id: "a-suma",
      classId: cls.id,
      title: "Suma de dos números",
      instructions:
        "Lee dos números enteros (uno por línea) y escribe su suma.\n\nEjemplo: si la entrada es 3 y 4, la salida debe ser 7.",
      language: "pseudocode",
      testCasesJson: JSON.stringify([
        { input: "3\n4", expected: "7" },
        { input: "10\n-2", expected: "8" },
        { input: "0\n0", expected: "0" },
      ]),
      dueDate: "2026-07-15",
      scaleJson: SCALE_CL,
      weight: 30,
      latePolicyJson: JSON.stringify({ acceptLate: true, penaltyPercent: 20 }),
    },
  });

  await prisma.assignment.create({
    data: {
      id: "a-tabla",
      classId: cls.id,
      title: "Tabla de multiplicar (x1 a x5)",
      instructions:
        "Lee un número entero n e imprime sus primeros 5 múltiplos, uno por línea.\n\nEjemplo: para n = 3 la salida es 3, 6, 9, 12, 15 (cada uno en su línea).\n\n⚠ El plazo ya venció: se acepta entrega atrasada con 25% de penalización.",
      language: "python",
      testCasesJson: JSON.stringify([
        { input: "3", expected: "3\n6\n9\n12\n15" },
        { input: "7", expected: "7\n14\n21\n28\n35" },
      ]),
      dueDate: "2026-07-05",
      scaleJson: SCALE_PCT,
      weight: 30,
      latePolicyJson: JSON.stringify({ acceptLate: true, penaltyPercent: 25 }),
    },
  });

  await prisma.assignment.create({
    data: {
      id: "a-saludo",
      classId: cls.id,
      title: "Saludo interactivo (revisión manual)",
      instructions:
        "Escribe un programa que lea el nombre del usuario y su edad, y salude indicando cuántos años tendrá el próximo año.\n\nEsta tarea NO tiene casos de prueba: usa el panel de Entrada Manual para probar tu programa con distintos datos. Al entregar, tu código queda pendiente de revisión por el profesor.",
      language: "python",
      testCasesJson: "[]",
      dueDate: "2026-07-20",
      scaleJson: SCALE_CL,
      weight: 40,
      latePolicyJson: JSON.stringify({ acceptLate: false, penaltyPercent: 0 }),
    },
  });

  await prisma.submission.createMany({
    data: [
      {
        assignmentId: suma.id,
        studentEmail: "ana.garcia@demo.edu",
        code: "Proceso Suma\n\tLeer a\n\tLeer b\n\tEscribir a + b\nFinProceso",
        passed: 3,
        total: 3,
        score: 7.0,
        status: "auto",
        isLate: false,
        penaltyApplied: 0,
        submittedAt: new Date("2026-07-03T18:22:00.000Z"),
        outcomesJson: JSON.stringify([
          { passed: true, got: "7" },
          { passed: true, got: "8" },
          { passed: true, got: "0" },
        ]),
      },
      {
        assignmentId: suma.id,
        studentEmail: "luis.perez@demo.edu",
        code: "Proceso Suma\n\tLeer a\n\tLeer b\n\tEscribir a - b\nFinProceso",
        passed: 1,
        total: 3,
        score: 3.0,
        status: "auto",
        isLate: false,
        penaltyApplied: 0,
        submittedAt: new Date("2026-07-04T14:05:00.000Z"),
        outcomesJson: JSON.stringify([
          { passed: false, got: "-1" },
          { passed: false, got: "12" },
          { passed: true, got: "0" },
        ]),
      },
    ],
  });

  console.log("Seed completado: clase demo, 3 tareas, 2 entregas, profesor demo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
