import type {
  Assignment as DbAssignment,
  ClassRoom as DbClassRoom,
  Submission as DbSubmission,
} from "@prisma/client";
import type { Assignment, ClassRoom, Submission } from "@/lib/state/work";

/**
 * Mappers BD → shape del cliente. Los campos *Json de SQLite se
 * deserializan aquí, de modo que los componentes consumen exactamente
 * los mismos tipos que antes de conectar la base de datos.
 */

export function toClientClass(row: DbClassRoom): ClassRoom {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    teacherEmail: row.teacherEmail,
    students: JSON.parse(row.studentsJson),
  };
}

export function toClientAssignment(row: DbAssignment): Assignment {
  return {
    id: row.id,
    classId: row.classId,
    title: row.title,
    instructions: row.instructions,
    language: row.language as Assignment["language"],
    testCases: JSON.parse(row.testCasesJson),
    dueDate: row.dueDate,
    gradeScale: JSON.parse(row.scaleJson),
    weight: row.weight,
    latePolicy: JSON.parse(row.latePolicyJson),
  };
}

export function toClientSubmission(row: DbSubmission): Submission {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    studentEmail: row.studentEmail,
    code: row.code,
    passed: row.passed,
    total: row.total,
    score: row.score,
    status: row.status as Submission["status"],
    isLate: row.isLate,
    penaltyApplied: row.penaltyApplied,
    submittedAt: row.submittedAt.toISOString(),
    outcomes: JSON.parse(row.outcomesJson),
  };
}
