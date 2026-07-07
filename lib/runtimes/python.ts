import { cleanPythonError, getPyodide } from "../pyodide/loader";
import { RunIO } from "./types";

/**
 * Harness de ejecución: compila el código del usuario con un nombre de
 * archivo propio ("<programa>") para obtener tracebacks limpios.
 * En modo lote (evaluador) se parchea input() para que NO haga eco del
 * prompt en stdout, y así la salida sea comparable con la esperada.
 */
const HARNESS = (batch: boolean) => `
import builtins as _b
_orig_input = _b.input
${batch ? "_b.input = lambda *a, **k: _orig_input()" : ""}
try:
    exec(compile(_SRC, "<programa>", "exec"), {"__name__": "__main__"})
finally:
    _b.input = _orig_input
`;

export async function runPython(code: string, io: RunIO): Promise<void> {
  const pyodide = await getPyodide();

  pyodide.setStdout({ batched: io.onStdout });
  pyodide.setStderr({ batched: io.onStderr });

  if (io.stdinLines !== undefined) {
    const queue = [...io.stdinLines];
    pyodide.setStdin({ stdin: () => queue.shift() ?? "" });
  } else {
    pyodide.setStdin({
      stdin: () => window.prompt("Entrada solicitada (input):") ?? "",
    });
  }

  pyodide.globals.set("_SRC", code);
  try {
    await pyodide.runPythonAsync(HARNESS(io.stdinLines !== undefined));
  } catch (error) {
    io.onStderr(cleanPythonError(error));
  }
}
