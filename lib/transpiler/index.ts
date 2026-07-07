/**
 * API pública del transpilador.
 *
 *   const { python, errors } = transpile(pseudocodigo);
 *
 * Pipeline: texto → parse() → AST → generate() → Python.
 * Es 100% local y determinista: sin APIs de IA ni red.
 */

import { TranspileError } from "./ast";
import { generate } from "./generator";
import { parse } from "./parser";

export interface TranspileResult {
  python: string;
  errors: TranspileError[];
}

export function transpile(source: string): TranspileResult {
  if (source.trim() === "") {
    return { python: "# Escribe pseudocódigo en el panel izquierdo...\n", errors: [] };
  }

  const { program, errors, imports, usesRead } = parse(source);
  const python = generate(program, { imports, usesRead });

  return { python, errors };
}

export type { TranspileError };
