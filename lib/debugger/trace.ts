/**
 * Debugger visual basado en trazas.
 *
 * Estrategia: en lugar de pausar el intérprete (imposible de forma
 * limpia en WebAssembly), se ejecuta el programa UNA vez con
 * sys.settrace() grabando, por cada línea ejecutada, el número de
 * línea y una foto del estado de las variables. La UI luego "reproduce"
 * esa grabación paso a paso, resaltando la línea y mostrando la memoria.
 */

import { cleanPythonError, getPyodide } from "../pyodide/loader";
import { RunIO } from "../runtimes/types";

export interface TraceStep {
  line: number;
  vars: Record<string, string>;
}

export interface TraceResult {
  steps: TraceStep[];
  error: string | null;
  truncated: boolean;
}

const MAX_STEPS = 400;

const TRACER = `
import sys, json, traceback

_steps = []
_err = None

def _fmt(value):
    try:
        text = repr(value)
    except Exception:
        text = "<sin representación>"
    return text if len(text) <= 80 else text[:77] + "..."

def _snapshot(frame):
    return {
        name: _fmt(value)
        for name, value in frame.f_locals.items()
        if not name.startswith("_") and not callable(value) and type(value).__name__ != "module"
    }

def _tracer(frame, event, arg):
    if event == "line" and frame.f_code.co_filename == "<programa>":
        if len(_steps) < ${MAX_STEPS}:
            _steps.append({"line": frame.f_lineno, "vars": _snapshot(frame)})
    return _tracer

_globals = {"__name__": "__main__"}
sys.settrace(_tracer)
try:
    exec(compile(_SRC, "<programa>", "exec"), _globals)
except Exception:
    _err = traceback.format_exc(limit=2)
finally:
    sys.settrace(None)

json.dumps({"steps": _steps, "error": _err, "truncated": len(_steps) >= ${MAX_STEPS}})
`;

export async function tracePython(code: string, io: RunIO): Promise<TraceResult> {
  const pyodide = await getPyodide();

  pyodide.setStdout({ batched: io.onStdout });
  pyodide.setStderr({ batched: io.onStderr });
  pyodide.setStdin({
    stdin: () => window.prompt("Entrada solicitada (input):") ?? "",
  });

  pyodide.globals.set("_SRC", code);
  try {
    const raw = (await pyodide.runPythonAsync(TRACER)) as string;
    return JSON.parse(raw) as TraceResult;
  } catch (error) {
    return { steps: [], error: cleanPythonError(error), truncated: false };
  }
}
