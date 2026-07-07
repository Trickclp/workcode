/**
 * Motor de calificaciones de Work.Code.
 *
 * El profesor elige la escala por tarea (ej. 1.0–7.0 chilena, 0–100)
 * y el peso del ejercicio en el curso. El auto-evaluador produce un
 * ratio de aciertos [0..1] que aquí se convierte a nota, aplicando la
 * penalización por entrega atrasada cuando corresponde.
 */

export interface GradeScale {
  min: number;
  max: number;
  passing: number;
}

export const SCALE_PRESETS: { id: string; label: string; scale: GradeScale }[] = [
  { id: "cl7", label: "1.0 a 7.0 — aprueba con 4.0 (Chile)", scale: { min: 1, max: 7, passing: 4 } },
  { id: "pct", label: "0 a 100 — aprueba con 60", scale: { min: 0, max: 100, passing: 60 } },
  { id: "dec", label: "0 a 10 — aprueba con 6", scale: { min: 0, max: 10, passing: 6 } },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Convierte el ratio de aciertos del evaluador [0..1] a nota en la escala. */
export function computeScore(ratio: number, scale: GradeScale): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return round1(scale.min + clamped * (scale.max - scale.min));
}

/** Resta el % de penalización sobre los puntos obtenidos por encima del mínimo. */
export function applyLatePenalty(score: number, scale: GradeScale, penaltyPercent: number): number {
  const earned = score - scale.min;
  return round1(scale.min + earned * (1 - penaltyPercent / 100));
}

export function isPassing(score: number | null, scale: GradeScale): boolean {
  return score !== null && score >= scale.passing;
}

export function formatScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(1);
}

/** Ratio normalizado [0..1] de una nota dentro de su escala (para promedios ponderados). */
export function scoreRatio(score: number, scale: GradeScale): number {
  return scale.max === scale.min ? 0 : (score - scale.min) / (scale.max - scale.min);
}

/** true si ya pasó la fecha límite (el día completo de la fecha cuenta como plazo). */
export function isLateNow(dueDate: string): boolean {
  return Date.now() > new Date(`${dueDate}T23:59:59`).getTime();
}
