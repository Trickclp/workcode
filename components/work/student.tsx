"use client";

/**
 * Vistas del rol Alumno: Tareas Pendientes, Entregas y Calificaciones
 * (con escalas por tarea, avance ponderado y estados de revisión).
 */

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth/store";
import { formatScore, isLateNow, isPassing, scoreRatio } from "@/lib/grading";
import { getLanguage } from "@/lib/runtimes";
import { useWork } from "@/lib/state/work";

function useStudentData() {
  const { user } = useAuth();
  const { classes, assignments, submissions } = useWork();
  const email = user?.email ?? "";

  // El servidor ya filtra por inscripción; aquí solo se organiza.
  const myClasses = classes;
  const myClassIds = new Set(myClasses.map((c) => c.id));
  const myAssignments = assignments.filter((a) => myClassIds.has(a.classId));
  const mySubmissions = submissions.filter((s) => s.studentEmail === email);
  const submittedIds = new Set(mySubmissions.map((s) => s.assignmentId));

  return { email, myClasses, myAssignments, mySubmissions, submittedIds, classes };
}

/** Formulario de inscripción con el código que comparte el profesor. */
function JoinClassForm() {
  const { joinClass } = useWork();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy(true);
        const joined = await joinClass(code);
        setBusy(false);
        if (joined) setCode("");
      }}
    >
      <input
        className="input"
        placeholder="Código de clase (ej: PROG1-2026)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Uniéndome..." : "+ Unirme a la clase"}
      </button>
    </form>
  );
}

// ── Tareas Pendientes ──────────────────────────────────────────────

export function StudentTasks() {
  const { myClasses, myAssignments, submittedIds, classes } = useStudentData();
  const pending = myAssignments.filter((a) => !submittedIds.has(a.id));

  return (
    <div className="page">
      <h1>Tareas Pendientes</h1>
      <p className="page-subtitle">
        Al abrir una tarea verás las instrucciones junto al editor; al entregar, el
        auto-evaluador corre los casos de prueba al instante (o queda en revisión manual).
      </p>

      <div className="join-section">
        {myClasses.length > 0 && (
          <div className="class-chips">
            {myClasses.map((cls) => (
              <span key={cls.id} className="badge ok" title={`Código: ${cls.code}`}>
                🏫 {cls.name}
              </span>
            ))}
          </div>
        )}
        <JoinClassForm />
      </div>

      {myClasses.length === 0 && (
        <div className="empty-note">
          Aún no perteneces a ninguna clase. Pide el <strong>código de clase</strong> a tu
          profesor e ingrésalo arriba para ver tus tareas.
        </div>
      )}
      {myClasses.length > 0 && pending.length === 0 && (
        <div className="empty-note">🎉 No tienes tareas pendientes.</div>
      )}

      <div className="card-grid">
        {pending.map((assignment) => {
          const lang = getLanguage(assignment.language);
          const cls = classes.find((c) => c.id === assignment.classId);
          const late = isLateNow(assignment.dueDate);
          return (
            <div key={assignment.id} className="info-card">
              <div className="lang-chip" style={{ color: lang?.accent }}>
                {lang?.badge} {lang?.label}
              </div>
              <h3>{assignment.title}</h3>
              <div className="info-meta">
                🏫 {cls?.name} · 📅 entrega: {assignment.dueDate} · ⚖ peso {assignment.weight}%
              </div>
              <div className="info-meta">
                {assignment.testCases.length > 0
                  ? `🤖 Auto-evaluada (${assignment.testCases.length} casos) · escala ${assignment.gradeScale.min}–${assignment.gradeScale.max}`
                  : "👩‍🏫 Revisión manual · con Entrada Manual"}
              </div>
              {late && (
                <span className={`badge ${assignment.latePolicy.acceptLate ? "late" : "closed"}`}>
                  {assignment.latePolicy.acceptLate
                    ? `⏰ Plazo vencido — penalización ${assignment.latePolicy.penaltyPercent}%`
                    : "🚫 Plazo cerrado"}
                </span>
              )}
              <Link className="btn primary" href={`/work/task/${assignment.id}`}>
                Resolver →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Entregas ───────────────────────────────────────────────────────

export function StudentSubmissions() {
  const { mySubmissions, myAssignments } = useStudentData();

  return (
    <div className="page">
      <h1>Entregas</h1>
      <p className="page-subtitle">Historial de tus envíos y su resultado.</p>

      {mySubmissions.length === 0 && (
        <div className="empty-note">Aún no has entregado ninguna tarea.</div>
      )}

      {mySubmissions.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Aciertos</th>
              <th>Nota</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...mySubmissions].reverse().map((sub) => {
              const assignment = myAssignments.find((a) => a.id === sub.assignmentId);
              return (
                <tr key={sub.id}>
                  <td>{assignment?.title ?? sub.assignmentId}</td>
                  <td>{sub.status === "auto" ? `${sub.passed}/${sub.total}` : "—"}</td>
                  <td>
                    <span
                      className={`score ${
                        sub.score === null
                          ? "pending"
                          : assignment && isPassing(sub.score, assignment.gradeScale)
                            ? "pass"
                            : "fail"
                      }`}
                    >
                      {formatScore(sub.score)}
                    </span>
                  </td>
                  <td>
                    {sub.status === "pendiente" && (
                      <span className="badge pending">⏳ En revisión</span>
                    )}
                    {sub.status === "manual" && (
                      <span className="badge ok">🧑‍🏫 Calificada</span>
                    )}
                    {sub.isLate && (
                      <span className="badge late">
                        ⏰ Atrasada{sub.penaltyApplied > 0 ? ` −${sub.penaltyApplied}%` : ""}
                      </span>
                    )}
                    {sub.status === "auto" && !sub.isLate && (
                      <span className="badge ok">✓ Auto</span>
                    )}
                  </td>
                  <td>
                    {new Date(sub.submittedAt).toLocaleString("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <Link className="btn ghost small" href={`/work/task/${sub.assignmentId}`}>
                      Reintentar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Calificaciones ─────────────────────────────────────────────────

export function StudentGrades() {
  const { mySubmissions, myAssignments } = useStudentData();

  // Mejor entrega calificada por tarea.
  const best = new Map<string, number>();
  for (const sub of mySubmissions) {
    if (sub.score === null) continue;
    best.set(sub.assignmentId, Math.max(best.get(sub.assignmentId) ?? -Infinity, sub.score));
  }
  const graded = [...best.entries()]
    .map(([assignmentId, score]) => ({
      assignment: myAssignments.find((a) => a.id === assignmentId),
      score,
    }))
    .filter((g) => g.assignment);

  // Avance ponderado: promedio de ratios normalizados según el peso de
  // cada tarea (independiente de la escala de cada una).
  const totalWeight = graded.reduce((sum, g) => sum + g.assignment!.weight, 0);
  const weightedProgress =
    totalWeight === 0
      ? null
      : Math.round(
          (graded.reduce(
            (sum, g) => sum + scoreRatio(g.score, g.assignment!.gradeScale) * g.assignment!.weight,
            0
          ) /
            totalWeight) *
            100
        );

  return (
    <div className="page">
      <h1>Calificaciones</h1>
      <p className="page-subtitle">
        Se toma la mejor nota calificada de cada tarea. El avance ponderado combina tus notas
        normalizadas según el peso de cada ejercicio.
      </p>

      {weightedProgress !== null && (
        <div className="average-card">
          Avance ponderado del curso
          <strong className={weightedProgress >= 60 ? "pass" : "fail"}>{weightedProgress}%</strong>
        </div>
      )}

      {graded.length === 0 ? (
        <div className="empty-note">Todavía no hay calificaciones.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Escala</th>
              <th>Peso</th>
              <th>Mejor nota</th>
            </tr>
          </thead>
          <tbody>
            {graded.map(({ assignment, score }) => (
              <tr key={assignment!.id}>
                <td>{assignment!.title}</td>
                <td>
                  {assignment!.gradeScale.min}–{assignment!.gradeScale.max}
                </td>
                <td>{assignment!.weight}%</td>
                <td>
                  <span
                    className={`score ${isPassing(score, assignment!.gradeScale) ? "pass" : "fail"}`}
                  >
                    {formatScore(score)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
