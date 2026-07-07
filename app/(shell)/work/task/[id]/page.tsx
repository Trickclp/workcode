"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { useAuth } from "@/lib/auth/store";
import { EvaluationResult, evaluateSubmission } from "@/lib/evaluator/evaluate";
import {
  applyLatePenalty,
  computeScore,
  formatScore,
  isLateNow,
  isPassing,
} from "@/lib/grading";
import { getLanguage } from "@/lib/runtimes";
import { useWork } from "@/lib/state/work";

/**
 * Vista de tarea del alumno.
 *
 * - Con casos de prueba: al entregar, el auto-evaluador ejecuta el código
 *   contra cada caso y asigna la nota en la escala configurada por el
 *   profesor, aplicando penalización si la entrega es atrasada.
 * - Sin casos de prueba: se muestra el panel de Entrada Manual (stdin)
 *   y la entrega queda pendiente de revisión manual del profesor.
 */
export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { assignments, classes, submissions, addSubmission } = useWork();

  const assignment = assignments.find((a) => a.id === params.id);
  const cls = classes.find((c) => c.id === assignment?.classId);
  const myBest = submissions
    .filter(
      (s) => s.assignmentId === params.id && s.studentEmail === user?.email && s.score !== null
    )
    .reduce<number | null>(
      (best, s) => (best === null ? s.score : Math.max(best, s.score ?? 0)),
      null
    );

  const draftKey = `workcode-task-${params.id}`;
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<
    | { kind: "auto"; evaluation: EvaluationResult; score: number; isLate: boolean; penalty: number }
    | { kind: "manual" }
    | null
  >(null);

  useEffect(() => {
    setCode(window.localStorage.getItem(draftKey) ?? "");
    setReady(true);
  }, [draftKey]);

  const handleCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      window.localStorage.setItem(draftKey, next);
    },
    [draftKey]
  );

  const hasCases = (assignment?.testCases.length ?? 0) > 0;
  const late = assignment ? isLateNow(assignment.dueDate) : false;
  const submissionBlocked = late && !assignment?.latePolicy.acceptLate;

  const handleSubmit = useCallback(async () => {
    if (!assignment || !user || submissionBlocked) return;
    setEvaluating(true);
    setResult(null);

    if (!hasCases) {
      // Sin casos: entrega para revisión manual del profesor.
      await addSubmission({
        assignmentId: assignment.id,
        code,
        passed: 0,
        total: 0,
        score: null,
        status: "pendiente",
        isLate: late,
        penaltyApplied: 0,
        outcomes: [],
      });
      setResult({ kind: "manual" });
      setEvaluating(false);
      return;
    }

    const evaluation = await evaluateSubmission(
      assignment.language,
      code,
      assignment.testCases
    );

    const baseScore = computeScore(evaluation.ratio, assignment.gradeScale);
    const penalty = late ? assignment.latePolicy.penaltyPercent : 0;
    const score = late
      ? applyLatePenalty(baseScore, assignment.gradeScale, penalty)
      : baseScore;

    await addSubmission({
      assignmentId: assignment.id,
      code,
      passed: evaluation.passed,
      total: evaluation.total,
      score,
      status: "auto",
      isLate: late,
      penaltyApplied: penalty,
      outcomes: evaluation.outcomes,
    });
    setResult({ kind: "auto", evaluation, score, isLate: late, penalty });
    setEvaluating(false);
  }, [assignment, user, code, hasCases, late, submissionBlocked, addSubmission]);

  if (!assignment) {
    return (
      <div className="page">
        <h1>Tarea no encontrada</h1>
        <Link className="btn primary" href="/work">
          ← Volver a Work
        </Link>
      </div>
    );
  }

  const lang = getLanguage(assignment.language);

  const instructions = (
    <div className="task-panel">
      <Link href="/work" className="back-link">
        ← Work
      </Link>
      <h2>{assignment.title}</h2>
      <div className="task-meta">
        <span className="lang-chip" style={{ color: lang?.accent }}>
          {lang?.badge} {lang?.label}
        </span>
        <span>🏫 {cls?.name}</span>
        <span>⚖ Peso: {assignment.weight}%</span>
        <span>
          📊 Escala: {assignment.gradeScale.min}–{assignment.gradeScale.max} (aprueba{" "}
          {assignment.gradeScale.passing})
        </span>
        <span>📅 Entrega: {assignment.dueDate}</span>
        {myBest !== null && (
          <span>
            🏅 Tu mejor nota: <strong>{formatScore(myBest)}</strong>
          </span>
        )}
      </div>

      {late && (
        <div className={`deadline-banner ${submissionBlocked ? "closed" : "late"}`}>
          {submissionBlocked
            ? "🚫 El plazo venció y esta tarea no acepta entregas atrasadas."
            : `⏰ El plazo venció: puedes entregar, pero se aplicará una penalización del ${assignment.latePolicy.penaltyPercent}% sobre tu puntaje.`}
        </div>
      )}

      <h4>Instrucciones</h4>
      <p className="task-instructions">{assignment.instructions}</p>

      {hasCases ? (
        <>
          <h4>Caso de ejemplo</h4>
          <div className="example-case">
            <div>
              <span className="case-label">Entrada</span>
              <pre>{assignment.testCases[0]?.input || "(sin entrada)"}</pre>
            </div>
            <div>
              <span className="case-label">Salida esperada</span>
              <pre>{assignment.testCases[0]?.expected}</pre>
            </div>
          </div>
          <p className="hint">
            Tu código se evaluará contra {assignment.testCases.length} caso
            {assignment.testCases.length !== 1 && "s"} de prueba.
          </p>
        </>
      ) : (
        <p className="hint">
          👩‍🏫 Esta tarea no tiene casos de prueba: usa el panel de <strong>Entrada Manual</strong>{" "}
          para probar tu programa con tus propios datos. Al entregar, quedará pendiente de la
          revisión del profesor.
        </p>
      )}

      {result?.kind === "manual" && (
        <div className="eval-result">
          <h4>📤 Entrega registrada</h4>
          <p className="hint">
            Tu código quedó <strong>pendiente de revisión manual</strong> del profesor
            {late ? " (marcada como atrasada)" : ""}. Puedes volver a entregar si lo mejoras.
          </p>
        </div>
      )}

      {result?.kind === "auto" && (
        <div className="eval-result">
          <h4>Resultado de la evaluación</h4>
          <div
            className={`eval-score ${isPassing(result.score, assignment.gradeScale) ? "pass" : "fail"}`}
          >
            Nota: {formatScore(result.score)} — {result.evaluation.passed}/
            {result.evaluation.total} casos correctos
          </div>
          {result.isLate && (
            <p className="hint">
              ⏰ Entrega atrasada: se aplicó una penalización del {result.penalty}%.
            </p>
          )}
          <ul className="eval-cases">
            {result.evaluation.outcomes.map((outcome, i) => (
              <li key={i} className={outcome.passed ? "pass" : "fail"}>
                {outcome.passed ? "✓" : "✗"} Caso {i + 1}
                {!outcome.passed && (
                  <div className="eval-detail">
                    <span>Esperado:</span>
                    <pre>{assignment.testCases[i]?.expected}</pre>
                    <span>Obtenido:</span>
                    <pre>{outcome.got || "(vacío)"}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="hint">
            La entrega quedó registrada. Puedes reintentar cuantas veces quieras.
          </p>
        </div>
      )}
    </div>
  );

  if (!ready) return <div className="app-loading">Cargando tarea...</div>;

  return (
    <div className="editor-page">
      <EditorWorkspace
        language={assignment.language}
        code={code}
        onCodeChange={handleCodeChange}
        side={instructions}
        forceStdin={!hasCases}
        actions={
          <button
            className="btn accent"
            disabled={evaluating || submissionBlocked}
            title={submissionBlocked ? "El plazo venció y no se aceptan entregas atrasadas" : ""}
            onClick={() => void handleSubmit()}
          >
            {evaluating
              ? "⚙ Evaluando..."
              : hasCases
                ? "📤 Entregar y evaluar"
                : "📤 Entregar para revisión"}
          </button>
        }
      />
    </div>
  );
}
