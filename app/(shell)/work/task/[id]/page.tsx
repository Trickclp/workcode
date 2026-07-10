"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { useAuth } from "@/lib/auth/store";
import { formatScore, isLateNow, isPassing } from "@/lib/grading";
import { getLanguage } from "@/lib/runtimes";
import { Submission, useWork } from "@/lib/state/work";

/**
 * Vista de tarea del alumno.
 *
 * - Con casos de prueba: al entregar, el código viaja al servidor, que lo
 *   ejecuta contra cada caso, calcula la nota (con la escala y la
 *   penalización por atraso) y la devuelve. El navegador NO calcula la
 *   nota: así no se puede falsear.
 * - Sin casos de prueba: se muestra el panel de Entrada Manual (stdin)
 *   y la entrega queda pendiente de revisión manual del profesor.
 */
export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { assignments, classes, submissions, submitCode } = useWork();

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
  const [result, setResult] = useState<Submission | null>(null);

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
    // El servidor califica (con casos) o registra pendiente (sin casos).
    const created = await submitCode(assignment.id, code);
    setResult(created);
    setEvaluating(false);
  }, [assignment, user, code, submissionBlocked, submitCode]);

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

      {result && result.status === "pendiente" && (
        <div className="eval-result">
          <h4>📤 Entrega registrada</h4>
          <p className="hint">
            Tu código quedó <strong>pendiente de revisión manual</strong> del profesor
            {result.isLate ? " (marcada como atrasada)" : ""}. Puedes volver a entregar si lo
            mejoras.
          </p>
        </div>
      )}

      {result && result.status === "auto" && (
        <div className="eval-result">
          <h4>Resultado de la evaluación</h4>
          <div
            className={`eval-score ${isPassing(result.score, assignment.gradeScale) ? "pass" : "fail"}`}
          >
            Nota: {formatScore(result.score)} — {result.passed}/{result.total} casos correctos
          </div>
          <p className="hint hint-server">🔒 Calificado en el servidor de forma segura.</p>
          {result.isLate && result.penaltyApplied > 0 && (
            <p className="hint">
              ⏰ Entrega atrasada: se aplicó una penalización del {result.penaltyApplied}%.
            </p>
          )}
          <ul className="eval-cases">
            {result.outcomes.map((outcome, i) => (
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
