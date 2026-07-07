"use client";

/**
 * Editor reutilizable de toda la plataforma (Playground, Projects y Work).
 *
 * Incluye las dos funciones premium:
 *  - Debugger visual: graba una traza con sys.settrace (Pyodide) y la
 *    reproduce paso a paso resaltando la línea actual en Monaco y
 *    mostrando las variables en memoria.
 *  - AI Tutor: al detectar un error en la terminal aparece "Explicar
 *    error"; la explicación guía sin dar la solución.
 */

import { OnMount } from "@monaco-editor/react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { getLanguage, runCode, RuntimeId } from "@/lib/runtimes";
import { tracePython, TraceStep } from "@/lib/debugger/trace";
import { explainError, TutorAdvice } from "@/lib/tutor";
import { Console, ConsoleLine } from "@/components/Console";
import { CodeEditor } from "./CodeEditor";
import { DebuggerPanel } from "./DebuggerPanel";
import { TutorCard } from "./TutorCard";

interface EditorWorkspaceProps {
  language: RuntimeId;
  code: string;
  onCodeChange: (code: string) => void;
  /** Panel lateral opcional (instrucciones de una tarea). */
  side?: ReactNode;
  /** Acciones extra en la barra (ej: botón Entregar). */
  actions?: ReactNode;
  readOnly?: boolean;
  /**
   * Fuerza visible el panel de Entrada Manual (stdin). Lo usan las
   * tareas sin casos de prueba, donde el alumno provee sus datos.
   */
  forceStdin?: boolean;
}

type EditorInstance = Parameters<OnMount>[0];
type MonacoNamespace = Parameters<OnMount>[1];

export function EditorWorkspace({
  language,
  code,
  onCodeChange,
  side,
  actions,
  readOnly,
  forceStdin,
}: EditorWorkspaceProps) {
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [stdinOpen, setStdinOpen] = useState(false);
  const [stdinValue, setStdinValue] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<TutorAdvice | null>(null);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [trace, setTrace] = useState<{ steps: TraceStep[]; index: number } | null>(null);

  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const info = getLanguage(language);
  const canDebug = info?.debuggable ?? false;

  const push = useCallback((line: ConsoleLine) => {
    setConsoleLines((prev) => [...prev, line]);
  }, []);

  const resetOutput = useCallback((firstLine: ConsoleLine) => {
    setConsoleLines([firstLine]);
    setLastError(null);
    setAdvice(null);
    setTrace(null);
  }, []);

  const isRemote = info?.kind === "remote";
  const stdinActive = stdinOpen || !!forceStdin;

  const handleRun = useCallback(async () => {
    resetOutput({
      type: "system",
      text: isRemote
        ? `☁ Ejecutando (${info?.label ?? language}) en el servicio remoto...`
        : `▶ Ejecutando (${info?.label ?? language})...`,
    });
    setBusy(true);

    // Con panel de entrada activo (o runtime remoto) se ejecuta en modo
    // lote: el stdin sale del panel en vez de pedirse interactivamente.
    const stdinLines =
      stdinActive || isRemote ? stdinValue.split(/\r?\n/) : undefined;

    let stderrBuffer = "";
    await runCode(language, code, {
      onStdout: (text) => push({ type: "stdout", text }),
      onStderr: (text) => {
        stderrBuffer += text + "\n";
        push({ type: "stderr", text });
      },
      stdinLines,
    });

    setBusy(false);
    if (stderrBuffer.trim() !== "") {
      setLastError(stderrBuffer);
      push({ type: "system", text: "✕ Terminado con errores." });
    } else {
      push({ type: "system", text: "✓ Programa finalizado." });
    }
  }, [language, code, info, isRemote, stdinActive, stdinValue, push, resetOutput]);

  const handleDebug = useCallback(async () => {
    resetOutput({ type: "system", text: "🐞 Grabando traza de ejecución..." });
    setBusy(true);

    const result = await tracePython(code, {
      onStdout: (text) => push({ type: "stdout", text }),
      onStderr: (text) => push({ type: "stderr", text }),
    });

    setBusy(false);
    if (result.error) {
      setLastError(result.error);
      push({ type: "stderr", text: result.error });
    }
    if (result.steps.length > 0) {
      setTrace({ steps: result.steps, index: 0 });
      push({
        type: "system",
        text: `Traza lista: ${result.steps.length} pasos${result.truncated ? " (truncada)" : ""}. Usa los controles del panel derecho.`,
      });
    } else if (!result.error) {
      push({ type: "system", text: "No se registraron pasos ejecutables." });
    }
  }, [code, push, resetOutput]);

  const handleExplain = useCallback(async () => {
    if (!lastError) return;
    setTutorBusy(true);
    const result = await explainError({ stderr: lastError, code, language });
    setAdvice(result);
    setTutorBusy(false);
  }, [lastError, code, language]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  // Resalta la línea del paso actual del debugger en Monaco.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!trace) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }
    const step = trace.steps[trace.index];
    if (!step) return;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(step.line, 1, step.line, 1),
        options: {
          isWholeLine: true,
          className: "debug-line",
          glyphMarginClassName: "debug-line-glyph",
        },
      },
    ]);
    editor.revealLineInCenter(step.line);
  }, [trace]);

  return (
    <div className="ws">
      <div className="ws-toolbar">
        <span className="ws-lang" style={{ color: info?.accent }}>
          {info?.badge} {info?.label ?? language}
        </span>
        <div className="ws-actions">
          {actions}
          <button
            className={`btn ghost${stdinActive ? " toggled" : ""}`}
            disabled={!!forceStdin}
            onClick={() => setStdinOpen((v) => !v)}
            title="Panel de entrada estándar: escribe aquí los datos que leerá tu programa"
          >
            ⌨ Entrada
          </button>
          <button
            className="btn ghost"
            disabled={busy || !canDebug}
            onClick={handleDebug}
            title={canDebug ? "Ejecuta grabando el estado de cada línea" : "Disponible para Python"}
          >
            🐞 Paso a paso
          </button>
          <button className="btn primary" disabled={busy} onClick={handleRun} title="Ejecutar (el código corre en tu navegador)">
            {busy ? "⚙ Ejecutando..." : "▶ Ejecutar"}
          </button>
        </div>
      </div>

      <div className="ws-body">
        {side && <aside className="ws-side">{side}</aside>}
        <div className="ws-editor">
          <CodeEditor
            language={language}
            value={code}
            onChange={onCodeChange}
            readOnly={readOnly}
            onMount={handleMount}
          />
        </div>
        {trace && (
          <DebuggerPanel
            steps={trace.steps}
            index={trace.index}
            onIndexChange={(index) => setTrace((prev) => (prev ? { ...prev, index } : prev))}
            onExit={() => setTrace(null)}
          />
        )}
      </div>

      <div className={`ws-bottom${advice ? " with-tutor" : ""}`}>
        <div className="ws-console">
          {stdinActive && (
            <div className="stdin-panel">
              <label>
                ⌨ ENTRADA MANUAL (stdin) — una línea por cada lectura del programa
              </label>
              <textarea
                value={stdinValue}
                onChange={(e) => setStdinValue(e.target.value)}
                rows={2}
                placeholder={"Ej:\n3\n4"}
                spellCheck={false}
              />
            </div>
          )}
          {lastError && !advice && (
            <div className="tutor-offer">
              <span>Se detectó un error en la ejecución.</span>
              <button className="btn accent" disabled={tutorBusy} onClick={handleExplain}>
                {tutorBusy ? "Analizando..." : "✨ Explicar error"}
              </button>
            </div>
          )}
          <Console lines={consoleLines} />
        </div>
        {advice && <TutorCard advice={advice} onClose={() => setAdvice(null)} />}
      </div>
    </div>
  );
}
