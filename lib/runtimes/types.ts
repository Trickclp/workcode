/** Identificadores de los entornos de ejecución de Work.Code. */
export type RuntimeId =
  | "translator"
  | "pseudocode"
  | "python"
  | "javascript"
  | "typescript"
  | "sql"
  | "c"
  | "cpp"
  | "java"
  | "rust"
  | "go"
  | "php"
  | "ruby";

/**
 * local  → corre 100% en el navegador (Pyodide/WASM/Worker).
 * remote → corre en el servicio de compilación vía POST /api/execute
 *          (proxy a un motor tipo Piston/Judge0, configurable por env).
 */
export type RuntimeKind = "local" | "remote";

export interface RunIO {
  onStdout: (text: string) => void;
  onStderr: (text: string) => void;
  /**
   * Entrada estándar por lotes: respuestas para input()/Leer/prompt()
   * en orden. La usan el auto-evaluador y el panel de Entrada Manual.
   * En runtimes remotos SIEMPRE se envía como stdin del proceso.
   */
  stdinLines?: string[];
}

export interface LanguageInfo {
  id: RuntimeId;
  label: string;
  tagline: string;
  badge: string;
  accent: string;
  available: boolean;
  /** true si el debugger paso a paso está soportado. */
  debuggable: boolean;
  kind: RuntimeKind;
  sample: string;
}
