/**
 * Auto-evaluador de Work.Code: ejecuta el código del alumno contra cada
 * caso de prueba (input → output esperado) definido por el profesor.
 *
 * Devuelve el detalle por caso y el ratio de aciertos; la conversión a
 * nota (escala configurable + penalización por atraso) vive en
 * lib/grading.ts, donde el profesor controla las reglas.
 */

import { runCode } from "../runtimes";
import { RuntimeId } from "../runtimes/types";
import { TestCase, TestOutcome } from "../state/work";

export interface EvaluationResult {
  outcomes: TestOutcome[];
  passed: number;
  total: number;
  /** Proporción de casos correctos [0..1]. */
  ratio: number;
}

function normalize(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export async function evaluateSubmission(
  language: RuntimeId,
  code: string,
  testCases: TestCase[]
): Promise<EvaluationResult> {
  const outcomes: TestOutcome[] = [];

  for (const testCase of testCases) {
    let stdout = "";
    let stderr = "";

    await runCode(language, code, {
      onStdout: (text) => (stdout += text + "\n"),
      onStderr: (text) => (stderr += text + "\n"),
      stdinLines: testCase.input.split(/\r?\n/),
    });

    const got = stderr.trim() !== "" ? `[ERROR] ${normalize(stderr)}` : normalize(stdout);
    outcomes.push({
      passed: stderr.trim() === "" && normalize(stdout) === normalize(testCase.expected),
      got,
    });
  }

  const passed = outcomes.filter((o) => o.passed).length;
  const total = outcomes.length;

  return { outcomes, passed, total, ratio: total === 0 ? 0 : passed / total };
}
