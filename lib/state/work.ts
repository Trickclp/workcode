"use client";

/**
 * Módulo institucional (Work) de Work.Code — conectado a la base de
 * datos real vía /api/work/*. Este store es una caché de cliente:
 * fetchAll() hidrata desde el servidor y cada acción hace POST y
 * actualiza la caché con la respuesta autoritativa del backend.
 */

import { create } from "zustand";
import { GradeScale } from "../grading";
import { RuntimeId } from "../runtimes/types";

export interface TestCase {
  /** Líneas de entrada (stdin), separadas por salto de línea. */
  input: string;
  /** Salida esperada exacta (se normalizan espacios finales). */
  expected: string;
}

export interface LatePolicy {
  acceptLate: boolean;
  /** % de descuento sobre los puntos obtenidos si la entrega es atrasada. */
  penaltyPercent: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  teacherEmail: string;
  students: string[];
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  language: RuntimeId;
  /** Si está VACÍO, la tarea es de revisión manual con Entrada Manual. */
  testCases: TestCase[];
  dueDate: string; // ISO yyyy-mm-dd
  gradeScale: GradeScale;
  /** Peso del ejercicio en el curso (%). */
  weight: number;
  latePolicy: LatePolicy;
}

export interface TestOutcome {
  passed: boolean;
  got: string;
}

/** auto = evaluada por casos; pendiente = espera al profesor; manual = calificada por el profesor. */
export type SubmissionStatus = "auto" | "pendiente" | "manual";

export interface Submission {
  id: string;
  assignmentId: string;
  studentEmail: string;
  code: string;
  passed: number;
  total: number;
  /** Nota en la escala de la tarea; null si está pendiente de revisión manual. */
  score: number | null;
  status: SubmissionStatus;
  isLate: boolean;
  penaltyApplied: number;
  submittedAt: string; // ISO datetime
  outcomes: TestOutcome[];
}

/** Entrega tal como la envía el cliente (identidad y fecha las pone el servidor). */
export type NewSubmission = Omit<Submission, "id" | "submittedAt" | "studentEmail">;

interface WorkState {
  classes: ClassRoom[];
  assignments: Assignment[];
  submissions: Submission[];
  loaded: boolean;
  loading: boolean;

  fetchAll(): Promise<void>;
  createClass(name: string): Promise<void>;
  createAssignment(assignment: Omit<Assignment, "id">): Promise<string | null>;
  updateAssignment(id: string, patch: Partial<Omit<Assignment, "id" | "classId">>): Promise<boolean>;
  /** Envía SOLO el código; el servidor califica y devuelve la entrega ya evaluada. */
  submitCode(assignmentId: string, code: string): Promise<Submission | null>;
  /** Inscripción del alumno con el código de clase. true si quedó inscrito. */
  joinClass(code: string): Promise<boolean>;
  /** Calificación manual del profesor para entregas pendientes. */
  gradeSubmission(id: string, score: number): Promise<void>;
  /** Profesor: elimina una tarea y sus entregas. */
  deleteAssignment(id: string): Promise<void>;
  /** Profesor: quita a un alumno de una clase. */
  removeStudent(classId: string, email: string): Promise<void>;
  /** Profesor: elimina una clase completa. */
  deleteClass(id: string): Promise<void>;
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    window.alert(data?.error ?? `Error del servidor (${response.status}).`);
    return null;
  }
  return (await response.json()) as T;
}

export const useWork = create<WorkState>()((set, get) => ({
  classes: [],
  assignments: [],
  submissions: [],
  loaded: false,
  loading: false,

  fetchAll: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const response = await fetch("/api/work");
      if (response.ok) {
        const data = (await response.json()) as Pick<
          WorkState,
          "classes" | "assignments" | "submissions"
        >;
        set({ ...data, loaded: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  createClass: async (name) => {
    const created = await postJson<ClassRoom>("/api/work/classes", { name });
    if (created) set((state) => ({ classes: [...state.classes, created] }));
  },

  createAssignment: async (assignment) => {
    const created = await postJson<Assignment>("/api/work/assignments", assignment);
    if (!created) return null;
    set((state) => ({ assignments: [...state.assignments, created] }));
    return created.id;
  },

  updateAssignment: async (id, patch) => {
    const response = await fetch(`/api/work/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error ?? "No se pudo actualizar la tarea.");
      return false;
    }
    const updated = (await response.json()) as Assignment;
    set((state) => ({ assignments: state.assignments.map((a) => (a.id === id ? updated : a)) }));
    return true;
  },

  submitCode: async (assignmentId, code) => {
    const created = await postJson<Submission>("/api/work/submissions", { assignmentId, code });
    if (created) set((state) => ({ submissions: [...state.submissions, created] }));
    return created;
  },

  joinClass: async (code) => {
    const joined = await postJson<ClassRoom>("/api/work/join", { code });
    if (!joined) return false;
    set((state) => ({
      classes: state.classes.some((c) => c.id === joined.id)
        ? state.classes
        : [...state.classes, joined],
    }));
    // Trae las tareas de la clase recién inscrita.
    await get().fetchAll();
    return true;
  },

  gradeSubmission: async (id, score) => {
    const response = await fetch(`/api/work/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error ?? `Error del servidor (${response.status}).`);
      return;
    }
    const updated = (await response.json()) as Submission;
    set((state) => ({
      submissions: state.submissions.map((s) => (s.id === id ? updated : s)),
    }));
  },

  deleteAssignment: async (id) => {
    const response = await fetch(`/api/work/assignments/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error ?? "No se pudo eliminar la tarea.");
      return;
    }
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
      submissions: state.submissions.filter((s) => s.assignmentId !== id),
    }));
  },

  removeStudent: async (classId, email) => {
    const response = await fetch(`/api/work/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeStudent: email }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error ?? "No se pudo quitar al alumno.");
      return;
    }
    const updated = (await response.json()) as ClassRoom;
    set((state) => ({ classes: state.classes.map((c) => (c.id === classId ? updated : c)) }));
  },

  deleteClass: async (id) => {
    const response = await fetch(`/api/work/classes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error ?? "No se pudo eliminar la clase.");
      return;
    }
    set((state) => ({
      classes: state.classes.filter((c) => c.id !== id),
      assignments: state.assignments.filter((a) => a.classId !== id),
    }));
  },
}));
