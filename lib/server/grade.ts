import { applyLatePenalty, computeScore, GradeScale, isLateNow } from "@/lib/grading";
import type { RuntimeId } from "@/lib/runtimes/types";
import type { TestCase, TestOutcome } from "@/lib/state/work";
import { runOnServer } from "./execute";

/**
 * Calificador autoritativo del servidor. Ejecuta el código del alumno
 * contra cada caso de prueba (en Wandbox) y calcula la nota final con
 * la escala del profesor y la penalización por atraso. El cliente NO
 * participa en el cálculo: solo envía el código.
 */

export interface GradeResult {
  outcomes: TestOutcome[];
  passed: number;
  total: number;
  score: number;
  isLate: boolean;
  penaltyApplied: number;
}

function normalize(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export async function gradeOnServer(
  language: RuntimeId,
  code: string,
  testCases: TestCase[],
  scale: GradeScale,
  dueDate: string,
  penaltyPercent: number,
  acceptLate: boolean
): Promise<GradeResult> {
  const outcomes: TestOutcome[] = [];

  for (const testCase of testCases) {
    const { stdout, stderr, infraError } = await runOnServer(language, code, testCase.input);
    if (infraError) {
      // Falla de infraestructura: se propaga para responder 502 y NO
      // registrar una nota injusta de 0.
      throw new Error(stderr || "Error del motor de ejecución.");
    }
    const errored = stderr.trim() !== "";
    const got = errored ? `[ERROR] ${normalize(stderr)}` : normalize(stdout);
    outcomes.push({
      passed: !errored && normalize(stdout) === normalize(testCase.expected),
      got,
    });
  }

  const passed = outcomes.filter((o) => o.passed).length;
  const total = outcomes.length;
  const ratio = total === 0 ? 0 : passed / total;

  const late = isLateNow(dueDate);
  const effectivePenalty = late && acceptLate ? penaltyPercent : 0;
  const base = computeScore(ratio, scale);
  const score = effectivePenalty > 0 ? applyLatePenalty(base, scale, effectivePenalty) : base;

  return { outcomes, passed, total, score, isLate: late, penaltyApplied: effectivePenalty };
}
