"use client";

/**
 * Vistas del rol Profesor: Mis Clases, Crear Tarea (escala de notas
 * configurable, peso, deadline con penalización y casos de prueba
 * opcionales) y Métricas de Alumnos con exportación a CSV/Excel.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/store";
import { downloadCsv } from "@/lib/export/csv";
import { formatScore, GradeScale, isPassing, SCALE_PRESETS } from "@/lib/grading";
import { LANGUAGES, RuntimeId } from "@/lib/runtimes";
import { Submission, TestCase, useWork } from "@/lib/state/work";
import { ScoreChart } from "./ScoreChart";

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
  const { classes, assignments, createClass, deleteClass, deleteAssignment, removeStudent } =
    useWork();
  const [name, setName] = useState("");

  const myClasses = classes.filter((c) => c.teacherEmail === user?.email);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => window.alert(`Código "${code}" copiado. Compártelo con tus alumnos.`),
      () => {}
    );
  };

  return (
    <div className="page">
      <h1>Mis Clases</h1>
      <p className="page-subtitle">
        Comparte el código con tus alumnos para que se unan. Aquí gestionas sus tareas y quién
        está inscrito.
      </p>

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

      {myClasses.length === 0 && (
        <div className="empty-note">Aún no has creado ninguna clase.</div>
      )}

      {myClasses.map((cls) => {
        const clsAssignments = assignments.filter((a) => a.classId === cls.id);
        const students = cls.students.filter((e) => e !== cls.teacherEmail);
        return (
          <div key={cls.id} className="class-block">
            <div className="class-head">
              <div>
                <h3>{cls.name}</h3>
                <button className="class-code" onClick={() => copyCode(cls.code)} title="Copiar código">
                  {cls.code} 📋
                </button>
              </div>
              <button
                className="btn ghost small danger"
                onClick={() => {
                  if (window.confirm(`¿Eliminar la clase "${cls.name}" con todas sus tareas y entregas? Esto no se puede deshacer.`))
                    void deleteClass(cls.id);
                }}
              >
                Eliminar clase
              </button>
            </div>

            <div className="class-cols">
              <div className="class-col">
                <h4>Tareas ({clsAssignments.length})</h4>
                {clsAssignments.length === 0 && <div className="empty-note">Sin tareas.</div>}
                {clsAssignments.map((a) => (
                  <div key={a.id} className="manage-row">
                    <Link href={`/work/task/${a.id}`} className="manage-name">
                      {a.title}
                    </Link>
                    <div className="manage-actions">
                      <Link className="icon-button" href={`/work/create?edit=${a.id}`} title="Editar">
                        ✎
                      </Link>
                      <button
                        className="icon-button danger"
                        title="Eliminar tarea"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la tarea "${a.title}" y sus entregas?`))
                            void deleteAssignment(a.id);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                <Link className="btn ghost small" href="/work/create">
                  + Nueva tarea
                </Link>
              </div>

              <div className="class-col">
                <h4>Alumnos ({students.length})</h4>
                {students.length === 0 && (
                  <div className="empty-note">Nadie se ha unido aún.</div>
                )}
                {students.map((email) => (
                  <div key={email} className="manage-row">
                    <span className="manage-name">{email}</span>
                    <button
                      className="icon-button danger"
                      title="Quitar de la clase"
                      onClick={() => {
                        if (window.confirm(`¿Quitar a ${email} de la clase?`))
                          void removeStudent(cls.id, email);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Crear Tarea ────────────────────────────────────────────────────

const EMPTY_CASE: TestCase = { input: "", expected: "" };

export function TeacherCreate() {
  return (
    <Suspense fallback={<div className="app-loading">Cargando...</div>}>
      <TeacherCreateInner />
    </Suspense>
  );
}

function TeacherCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user } = useAuth();
  const { classes, assignments, createAssignment, updateAssignment } = useWork();
  const myClasses = classes.filter((c) => c.teacherEmail === user?.email);

  // En modo edición, precarga los valores de la tarea existente.
  const editing = editId ? assignments.find((a) => a.id === editId) : undefined;

  const [classId, setClassId] = useState(editing?.classId ?? myClasses[0]?.id ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [language, setLanguage] = useState<RuntimeId>(editing?.language ?? "pseudocode");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "2026-07-31");
  const [instructions, setInstructions] = useState(editing?.instructions ?? "");
  const [testCases, setTestCases] = useState<TestCase[]>(
    editing && editing.testCases.length > 0 ? editing.testCases : [{ ...EMPTY_CASE }]
  );
  const [created, setCreated] = useState<string | null>(null);

  const [scalePreset, setScalePreset] = useState(SCALE_PRESETS[0].id);
  const [customScale, setCustomScale] = useState<GradeScale>(
    editing?.gradeScale ?? SCALE_PRESETS[0].scale
  );
  const [weight, setWeight] = useState(editing?.weight ?? 25);

  const [acceptLate, setAcceptLate] = useState(editing?.latePolicy.acceptLate ?? true);
  const [penaltyPercent, setPenaltyPercent] = useState(editing?.latePolicy.penaltyPercent ?? 20);

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

    const payload = {
      title: title.trim(),
      instructions,
      language,
      testCases: validCases,
      dueDate,
      gradeScale: customScale,
      weight,
      latePolicy: { acceptLate, penaltyPercent: acceptLate ? penaltyPercent : 0 },
    };

    if (editing) {
      const ok = await updateAssignment(editing.id, payload);
      if (ok) setCreated(editing.id);
    } else {
      const id = await createAssignment({ classId, ...payload });
      if (id) setCreated(id);
    }
  };

  if (created) {
    return (
      <div className="page">
        <h1>{editing ? "✅ Tarea actualizada" : "✅ Tarea publicada"}</h1>
        <p className="page-subtitle">
          {editing
            ? "Los cambios ya están guardados."
            : 'Tus alumnos ya la verán en "Tareas Pendientes" con la escala y el plazo que definiste.'}
        </p>
        <div className="inline-form">
          <Link className="btn primary" href={`/work/task/${created}`}>
            Ver la tarea →
          </Link>
          <button className="btn ghost" onClick={() => router.push("/work/classes")}>
            Volver a Mis Clases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{editing ? "Editar Tarea" : "Crear Tarea"}</h1>
      <p className="page-subtitle">
        Define el problema, la escala de calificación, el plazo y (opcionalmente) los casos de
        prueba del auto-evaluador. Sin casos, la tarea queda en revisión manual con Entrada
        Manual para el alumno.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Clase
            <select
              className="input"
              value={classId}
              disabled={!!editing}
              onChange={(e) => setClassId(e.target.value)}
            >
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
          {editing ? "💾 Guardar cambios" : "📝 Publicar tarea"}
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
          {subs.length > 0 && (
            <div className="metrics-chart-row">
              <div className="chart-box">
                <div className="chart-title">Distribución de notas</div>
                <ScoreChart
                  scores={subs
                    .filter((s) => s.score !== null)
                    .map((s) => s.score as number)}
                  scale={assignment.gradeScale}
                />
              </div>
              <div className="chart-box">
                <div className="chart-title">Aprobación</div>
                {(() => {
                  const graded = subs.filter((s) => s.score !== null);
                  const passed = graded.filter((s) =>
                    isPassing(s.score, assignment.gradeScale)
                  ).length;
                  const failed = graded.length - passed;
                  const pct = graded.length ? Math.round((passed / graded.length) * 100) : 0;
                  return (
                    <div className="pass-summary">
                      <div className="pass-bar">
                        <div className="pass-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="pass-legend">
                        <span className="pass">✓ {passed} aprueban</span>
                        <span className="fail">✗ {failed} reprueban</span>
                        <strong>{pct}%</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
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
