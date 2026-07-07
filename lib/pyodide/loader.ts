/**
 * Singleton de Pyodide compartido por toda la plataforma:
 * runner del Playground, auto-evaluador de tareas y debugger.
 * Se descarga una sola vez por sesión desde el CDN.
 */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  setStdin(options: { stdin: () => string }): void;
  globals: {
    set(name: string, value: unknown): void;
    delete(name: string): void;
  };
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null;

export function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = new Promise<PyodideInterface>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.onload = () => {
      window
        .loadPyodide!({ indexURL: PYODIDE_CDN })
        .then(resolve)
        .catch(reject);
    };
    script.onerror = () =>
      reject(new Error("No se pudo descargar Pyodide desde el CDN."));
    document.head.appendChild(script);
  });

  return pyodidePromise;
}

/** Extrae solo el traceback de Python, sin el ruido interno de Pyodide. */
export function cleanPythonError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = message.split("\n");
  const start = lines.findIndex((l) => l.startsWith("Traceback"));
  return start >= 0 ? lines.slice(start).join("\n") : message;
}
