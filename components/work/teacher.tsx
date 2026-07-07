"use client";

/**
 * Vistas del rol Profesor: Mis Clases, Crear Tarea (escala de notas
 * configurable, peso, deadline con penalización y casos de prueba
 * opcionales) y Métricas de Alumnos con exportación a CSV/Excel.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/store";
import { downloadCsv } from "@/lib/export/csv";
import { formatScore, GradeScale, isPassing, SCALE_PRESETS } from "@/lib/grading";
import { LANGUAGES, RuntimeId } from "@/lib/runtimes";
import { Submission, TestCase, useWork } from "@/lib/state/work";

const STATUS_LABEL: Record<Submission["status"], string> = {
  auto: "Auto-evaluada",
  pendiente: "Pendiente de revisión",
  manual: "Calificada (manual)",
};

/** Calificación manual inline para entregas pendientes. */
function GradeForm({ submission, scale }: { submission: Submission; scale: GradeScale }) {
  const { gradeSubmission } = useWork();
  const [value, setValue] = useState(String(scale.passing));
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grade-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await gradeSubmission(submission.id, Number(value));
        setBusy(false);
      }}
    >
      <input
        className="input tiny"
        type="number"
        step="0.1"
        min={scale.min}
        max={scale.max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        title={`Nota entre ${scale.min} y ${scale.max}`}
      />
      <button className="btn primary small" type="submit" disabled={busy}>
        {busy ? "..." : "Calificar"}
      </button>
    </form>
  );
}

// ── Mis Clases ─────────────────────────────────────────────────────

export function TeacherClasses() {
  const { user } = useAuth();
  const { classes, assignments, createClass } = useWork();
  const [name, setName] = useState("");

  const myClasses = classes.filter((c) => c.teacherEmail === user?.email);

  return (
    <div className="page">
      <h1>Mis Clases</h1>
      <p className="page-subtitle">
        Comparte el código de clase con tus alumnos para que se unan.
      </p>

      <div className="card-grid">
        {myClasses.map((cls) => (
          <div key={cls.id} className="info-card">
            <h3>{cls.name}</h3>
            <div className="class-code">{cls.code}</div>
            <div className="info-meta">
              👥 {cls.students.length} alumno{cls.students.length !== 1 && "s"} · 📝{" "}
              {assignments.filter((a) => a.classId === cls.id).length} tarea
              {assignments.filter((a) => a.classId === cls.id).length !== 1 && "s"}
            </div>
            {cls.students.length > 0 && (
              <ul className="student-list">
                {cls.students.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && user) {
            void createClass(name.trim());
            setName("");
          }
        }}
      >
        <input
          className="input"
          placeholder="Nombre de la nueva clase (ej: Programación II)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn primary" type="submit">
          + Crear clase
        </button>
      </form>
    </div>
  );
}

// ── Crear Tarea ────────────────────────────────────────────────────

const EMPTY_CASE: TestCase = { input: "", expected: "" };

export function TeacherCreate() {
  const router = useRouter();
  const { user } = useAuth();
  const { classes, createAssignment } = useWork();
  const myClasses = classes.filter((c) => c.teacherEmail === user?.email);

  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<RuntimeId>("pseudocode");
  const [dueDate, setDueDate] = useState("2026-07-31");
  const [instructions, setInstructions] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([{ ...EMPTY_CASE }]);
  const [created, setCreated] = useState<string | null>(null);

  // Sistema de calificaciones personalizable.
  const [scalePreset, setScalePreset] = useState(SCALE_PRESETS[0].id);
  const [customScale, setCustomScale] = useState<GradeScale>(SCALE_PRESETS[0].scale);
  const [weight, setWeight] = useState(25);

  // Política de entregas atrasadas.
  const [acceptLate, setAcceptLate] = useState(true);
  const [penaltyPercent, setPenaltyPercent] = useState(20);

  const applyPreset = (id: string) => {
    setScalePreset(id);
    const preset = SCALE_PRESETS.find((p) => p.id === id);
    if (preset) setCustomScale(preset.scale);
  };

  const updateCase = (index: number, field: keyof TestCase, value: string) =>
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCases = testCases.filter((tc) => tc.expected.trim() !== "");
    if (!classId || !title.trim()) {
      window.alert("Completa la clase y el título de la tarea.");
      return;
    }
    if (customScale.max <= customScale.min) {
      window.alert("La nota máxima debe ser mayor que la mínima.");
      return;
    }
    if (
      validCases.length === 0 &&
      !window.confirm(
        "No definiste casos de prueba: la tarea será de REVISIÓN MANUAL y el alumno verá el panel de Entrada Manual (stdin). ¿Continuar?"
      )
    ) {
      return;
    }

    const id = await createAssignment({
      classId,
      title: title.trim(),
      instructions,
      language,
      testCases: validCases,
      dueDate,
      gradeScale: customScale,
      weight,
      latePolicy: { acceptLate, penaltyPercent: acceptLate ? penaltyPercent : 0 },
    });
    if (id) setCreated(id);
  };

  if (created) {
    return (
      <div className="page">
        <h1>✅ Tarea publicada</h1>
        <p className="page-subtitle">
          Tus alumnos ya la verán en &quot;Tareas Pendientes&quot; con la escala y el plazo que
          definiste.
        </p>
        <div className="inline-form">
          <Link className="btn primary" href={`/work/task/${created}`}>
            Probarla como alumno →
          </Link>
          <button className="btn ghost" onClick={() => router.refresh()}>
            Crear otra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Crear Tarea</h1>
      <p className="page-subtitle">
        Define el problema, la escala de calificación, el plazo y (opcionalmente) los casos de
        prueba del auto-evaluador. Sin casos, la tarea queda en revisión manual con Entrada
        Manual para el alumno.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Clase
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {myClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lenguaje
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value as RuntimeId)}
            >
              {LANGUAGES.filter((l) => l.available && l.id !== "translator").map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Título
          <input
            className="input"
            placeholder="Ej: Promedio de tres calificaciones"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label>
          Instrucciones para el alumno
          <textarea
            className="input"
            rows={5}
            placeholder="Describe el problema, el formato de entrada y el de salida..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>

        <fieldset className="form-section">
          <legend>📊 Sistema de calificación</legend>
          <div className="form-row">
            <label>
              Escala de notas
              <select
                className="input"
                value={scalePreset}
                onChange={(e) => applyPreset(e.target.value)}
              >
                {SCALE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mínima
              <input
                className="input"
                type="number"
                step="0.1"
                value={customScale.min}
                onChange={(e) => setCustomScale({ ...customScale, min: Number(e.target.value) })}
              />
            </label>
            <label>
              Máxima
              <input
                className="input"
                type="number"
                step="0.1"
                value={customScale.max}
                onChange={(e) => setCustomScale({ ...customScale, max: Number(e.target.value) })}
              />
            </label>
            <label>
              Aprueba con
              <input
                className="input"
                type="number"
                step="0.1"
                value={customScale.passing}
                onChange={(e) =>
                  setCustomScale({ ...customScale, passing: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Peso en el curso (%)
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>📅 Plazo de entrega</legend>
          <div className="form-row">
            <label>
              Fecha límite
              <input
                className="input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={acceptLate}
                onChange={(e) => setAcceptLate(e.target.checked)}
              />
              Aceptar entregas atrasadas
            </label>
            {acceptLate && (
              <label>
                Penalización por atraso (%)
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={penaltyPercent}
                  onChange={(e) => setPenaltyPercent(Number(e.target.value))}
                />
              </label>
            )}
          </div>
        </fieldset>

        <div className="cases-header">
          <span>
            Casos de prueba del auto-evaluador{" "}
            <span className="hint-inline">(opcional — sin casos = revisión manual)</span>
          </span>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setTestCases((prev) => [...prev, { ...EMPTY_CASE }])}
          >
            + Agregar caso
          </button>
        </div>

        {testCases.map((tc, i) => (
          <div key={i} className="case-row">
            <label>
              Entrada (stdin, una línea por lectura)
              <textarea
                className="input mono"
                rows={2}
                placeholder={"3\n4"}
                value={tc.input}
                onChange={(e) => updateCase(i, "input", e.target.value)}
              />
            </label>
            <label>
              Salida esperada (stdout exacto)
              <textarea
                className="input mono"
                rows={2}
                placeholder={"7"}
                value={tc.expected}
                onChange={(e) => updateCase(i, "expected", e.target.value)}
              />
            </label>
            <button
              type="button"
              className="icon-button case-delete"
              title="Quitar caso"
              onClick={() => setTestCases((prev) => prev.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}

        <button className="btn primary" type="submit">
          📝 Publicar tarea
        </button>
      </form>
    </div>
  );
}

// ── Métricas de Alumnos ────────────────────────────────────────────

export function TeacherMetrics() {
  const { user } = useAuth();
  const { classes, assignments, submissions } = useWork();

  const myClassIds = new Set(
    classes.filter((c) => c.teacherEmail === user?.email).map((c) => c.id)
  );
  const myAssignments = assignments.filter((a) => myClassIds.has(a.classId));

  const rows = useMemo(
    () =>
      myAssignments.map((assignment) => {
        const subs = submissions.filter((s) => s.assignmentId === assignment.id);
        const students = classes.find((c) => c.id === assignment.classId)?.students.length ?? 0;
        const graded = subs.filter((s) => s.score !== null);
        const avg =
          graded.length === 0
            ? null
            : Math.round(
                (graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length) * 10
              ) / 10;
        return { assignment, subs, students, avg };
      }),
    [myAssignments, submissions, classes]
  );

  const handleExport = () => {
    const csvRows: (string | number | null)[][] = [
      ["Clase", "Tarea", "Peso (%)", "Alumno", "Aciertos", "Nota", "Estado", "Atrasada", "Penalización (%)", "Fecha"],
    ];
    for (const { assignment, subs } of rows) {
      const clsName = classes.find((c) => c.id === assignment.classId)?.name ?? "";
      for (const s of subs) {
        csvRows.push([
          clsName,
          assignment.title,
          assignment.weight,
          s.studentEmail,
          s.status === "auto" ? `${s.passed}/${s.total}` : "—",
          formatScore(s.score),
          STATUS_LABEL[s.status],
          s.isLate ? "Sí" : "No",
          s.penaltyApplied,
          new Date(s.submittedAt).toLocaleString("es"),
        ]);
      }
    }
    downloadCsv(`workcode-calificaciones-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
  };

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Métricas de Alumnos</h1>
          <p className="page-subtitle">Resultados del auto-evaluador por tarea y por alumno.</p>
        </div>
        <button className="btn primary" onClick={handleExport}>
          ⬇ Exportar CSV (Excel)
        </button>
      </div>

      {rows.map(({ assignment, subs, students, avg }) => (
        <div key={assignment.id} className="metrics-block">
          <div className="metrics-title">
            <h3>
              {assignment.title}{" "}
              <span className="hint-inline">
                escala {assignment.gradeScale.min}–{assignment.gradeScale.max} · peso{" "}
                {assignment.weight}% · vence {assignment.dueDate}
              </span>
            </h3>
            <div className="metrics-stats">
              <span>
                📤 {subs.length}/{students} entregas
              </span>
              <span>
                📊 Promedio: <strong>{avg === null ? "—" : avg}</strong>
              </span>
            </div>
          </div>
          {subs.length === 0 ? (
            <div className="empty-note">Sin entregas todavía.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Aciertos</th>
                  <th>Nota</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>{s.studentEmail}</td>
                    <td>{s.status === "auto" ? `${s.passed}/${s.total}` : "—"}</td>
                    <td>
                      <span
                        className={`score ${
                          s.score === null
                            ? "pending"
                            : isPassing(s.score, assignment.gradeScale)
                              ? "pass"
                              : "fail"
                        }`}
                      >
                        {formatScore(s.score)}
                      </span>
                    </td>
                    <td>
                      {s.status === "pendiente" && <span className="badge pending">⏳ Por revisar</span>}
                      {s.status === "manual" && <span className="badge ok">🧑‍🏫 Manual</span>}
                      {s.isLate && (
                        <span className="badge late">
                          ⏰ Atrasada{s.penaltyApplied > 0 ? ` −${s.penaltyApplied}%` : ""}
                        </span>
                      )}
                      {s.status === "auto" && !s.isLate && <span className="badge ok">✓ Auto</span>}
                    </td>
                    <td>
                      {new Date(s.submittedAt).toLocaleString("es", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>
                      <details className="code-details">
                        <summary>Ver código</summary>
                        <pre>{s.code}</pre>
                      </details>
                      {s.status === "pendiente" && (
                        <GradeForm submission={s} scale={assignment.gradeScale} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
