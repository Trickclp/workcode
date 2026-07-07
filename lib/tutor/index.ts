"use client";

/**
 * Punto de entrada del AI Tutor.
 * Intenta primero la IA (ruta /api/tutor con Claude); si no hay API key,
 * falla la red o tarda demasiado, cae al motor local de heurísticas.
 */

import { RuntimeId } from "../runtimes/types";
import { explainLocally, TutorAdvice } from "./heuristics";

export type { TutorAdvice };

export async function explainError(params: {
  stderr: string;
  code: string;
  language: RuntimeId;
}): Promise<TutorAdvice> {
  try {
    const response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        title: string;
        meaning: string;
        hints: string[];
        line: number | null;
      };
      if (data.title && Array.isArray(data.hints)) {
        return { source: "ia", ...data };
      }
    }
  } catch {
    // Sin conexión o sin API key: seguimos con el tutor local.
  }

  return explainLocally(params.stderr, params.language);
}
