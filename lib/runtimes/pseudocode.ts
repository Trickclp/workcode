import { transpile } from "../transpiler";
import { runPython } from "./python";
import { RunIO } from "./types";

/** Pseudocódigo = transpilar a Python (AST) y ejecutar con Pyodide. */
export async function runPseudocode(code: string, io: RunIO): Promise<void> {
  const { python, errors } = transpile(code);
  if (errors.length > 0) {
    for (const error of errors) {
      io.onStderr(`[Línea ${error.line}] ${error.message}`);
    }
    return;
  }
  await runPython(python, io);
}
