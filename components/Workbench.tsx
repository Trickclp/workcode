"use client";

/**
 * Componente principal: dos paneles Monaco (pseudocódigo | Python)
 * + consola simulada abajo.
 *
 * La transpilación ocurre de forma síncrona en cada tecla (useMemo):
 * el parser AST tarda microsegundos, así que el panel derecho se
 * actualiza en tiempo real sin necesidad de debounce.
 */

import Editor, { Monaco } from "@monaco-editor/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { transpile } from "@/lib/transpiler";
import {
  PSEUDOCODE_LANGUAGE_ID,
  registerPseudocodeLanguage,
} from "@/lib/monaco/pseudocode-language";
import { usePyodide } from "@/lib/pyodide/usePyodide";
import { Console, ConsoleLine } from "./Console";

const SAMPLE = `Proceso EjemploCompleto
	// Declaración de variables
	Definir n, suma Como Entero

	Escribir "=== Tabla del 7 ==="
	Para i <- 1 Hasta 10 Hacer
		Escribir "7 x ", i, " = ", 7 * i
	FinPara

	// Condicionales anidados dentro de un bucle
	suma <- 0
	Mientras suma < 20 Hacer
		suma <- suma + 7
		Si suma MOD 2 = 0 Entonces
			Escribir suma, " es par"
		Sino
			Escribir suma, " es impar"
		FinSi
	FinMientras

	Escribir "Raíz de 144: ", Raiz(144)
FinProceso`;

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "Consolas, 'Courier New', monospace",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 12 },
  tabSize: 4,
} as const;

export default function Workbench() {
  const [pseudocode, setPseudocode] = useState(SAMPLE);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const { status, runPython } = usePyodide();

  // Pilar 1: transpilación AST síncrona en cada pulsación.
  const { python, errors } = useMemo(() => transpile(pseudocode), [pseudocode]);

  const pushLine = useCallback((line: ConsoleLine) => {
    setConsoleLines((prev) => [...prev, line]);
  }, []);

  const handleRun = useCallback(async () => {
    if (status !== "ready") return;
    setConsoleLines([{ type: "system", text: `▶ Ejecutando... (${new Date().toLocaleTimeString()})` }]);

    if (errors.length > 0) {
      errors.forEach((e) =>
        pushLine({ type: "stderr", text: `[Línea ${e.line}] ${e.message}` })
      );
      pushLine({
        type: "system",
        text: "Corrige los errores de pseudocódigo antes de ejecutar.",
      });
      return;
    }

    await runPython(python, {
      onStdout: (text) => pushLine({ type: "stdout", text }),
      onStderr: (text) => pushLine({ type: "stderr", text }),
    });
    pushLine({ type: "system", text: "✓ Programa finalizado." });
  }, [status, errors, python, runPython, pushLine]);

  // Guardamos la última versión de handleRun para el atajo Ctrl+Enter
  // (Monaco captura el ref una sola vez en onMount).
  const runRef = useRef(handleRun);
  runRef.current = handleRun;

  const handleSourceMount = useCallback(
    (editor: Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0], monaco: Monaco) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        void runRef.current();
      });
    },
    []
  );

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    registerPseudocodeLanguage(monaco);
  }, []);

  const statusLabel: Record<string, string> = {
    loading: "⏳ Cargando Python (WebAssembly)...",
    ready: "● Python listo",
    running: "⚙ Ejecutando...",
    error: "✕ Error al cargar Pyodide (revisa tu conexión)",
  };

  return (
    <div className="workbench">
      <header className="toolbar">
        <h1 className="logo">
          Work.Code <span>·</span> Traductor Pseudo<span>→</span>Python
        </h1>
        <div className="toolbar-right">
          <span className={`status status-${status}`}>{statusLabel[status]}</span>
          <button
            className="run-button"
            onClick={() => void handleRun()}
            disabled={status !== "ready"}
            title="Ctrl+Enter"
          >
            ▶ Ejecutar
          </button>
        </div>
      </header>

      <main className="panels">
        <section className="panel">
          <div className="panel-title">PSEUDOCÓDIGO</div>
          <Editor
            language={PSEUDOCODE_LANGUAGE_ID}
            theme="vs-dark"
            value={pseudocode}
            beforeMount={handleBeforeMount}
            onMount={handleSourceMount}
            onChange={(value) => setPseudocode(value ?? "")}
            options={EDITOR_OPTIONS}
          />
        </section>

        <section className="panel">
          <div className="panel-title">
            PYTHON GENERADO
            {errors.length > 0 && (
              <span className="error-badge">
                {errors.length} error{errors.length > 1 ? "es" : ""}: línea{" "}
                {errors[0].line} — {errors[0].message}
              </span>
            )}
          </div>
          <Editor
            language="python"
            theme="vs-dark"
            value={python}
            options={{ ...EDITOR_OPTIONS, readOnly: true }}
          />
        </section>
      </main>

      <Console lines={consoleLines} />
    </div>
  );
}
