import { transform } from "sucrase";
import { transpile } from "@/lib/transpiler";
import type { RuntimeId } from "@/lib/runtimes/types";

/**
 * Ejecutor de código del lado del SERVIDOR.
 *
 * A diferencia del Playground (que corre en el navegador para dar
 * respuesta instantánea y gratis), la CALIFICACIÓN se ejecuta aquí, en
 * el servidor, para que la nota sea confiable y el alumno no pueda
 * falsearla. Todos los lenguajes se ejecutan vía Wandbox:
 *   - pseudocódigo  → se transpila a Python (AST propio) y se ejecuta
 *   - typescript    → se transpila a JavaScript (Sucrase) y se ejecuta
 *   - el resto se ejecuta directo en su compilador/intérprete
 */

const WANDBOX_URL = process.env.EXECUTION_API_URL ?? "https://wandbox.org";

/** RuntimeId → nombre de lenguaje en Wandbox (para descubrir el compilador). */
const WANDBOX_LANGUAGE: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  sql: "SQL",
  c: "C",
  cpp: "C++",
  java: "Java",
  rust: "Rust",
  go: "Go",
  php: "PHP",
  ruby: "Ruby",
};

let compilerCache: Record<string, string> | null = null;

async function resolveCompiler(wandboxLang: string): Promise<string | null> {
  if (!compilerCache) {
    const response = await fetch(`${WANDBOX_URL}/api/list.json`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Wandbox list: ${response.status}`);
    const list = (await response.json()) as { name: string; language: string }[];
    compilerCache = {};
    for (const lang of Object.values(WANDBOX_LANGUAGE)) {
      const matches = list.filter((c) => c.language === lang);
      // Prefiere una versión ESTABLE; las "head" (nightly) suelen fallar.
      const compiler = matches.find((c) => !c.name.includes("head")) ?? matches[0];
      if (compiler) compilerCache[lang] = compiler.name;
    }
  }
  return compilerCache[wandboxLang] ?? null;
}

export interface ServerRunResult {
  stdout: string;
  stderr: string;
  /** true si ni siquiera se pudo ejecutar (error de infraestructura, no del alumno). */
  infraError: boolean;
}

export async function runOnServer(
  language: RuntimeId,
  code: string,
  stdin: string
): Promise<ServerRunResult> {
  // Normaliza pseudocódigo y TypeScript a un lenguaje que Wandbox corre.
  let effectiveLang: string = language;
  let source = code;

  if (language === "pseudocode" || language === "translator") {
    const { python, errors } = transpile(code);
    if (errors.length > 0) {
      return {
        stdout: "",
        stderr: errors.map((e) => `[Línea ${e.line}] ${e.message}`).join("\n"),
        infraError: false,
      };
    }
    source = python;
    effectiveLang = "python";
  } else if (language === "typescript") {
    try {
      source = transform(code, { transforms: ["typescript"] }).code;
    } catch (error) {
      return {
        stdout: "",
        stderr: `Error de sintaxis TypeScript: ${error instanceof Error ? error.message : String(error)}`,
        infraError: false,
      };
    }
    effectiveLang = "javascript";
  }

  // En Python, input(prompt) imprime el prompt en stdout y contaminaría
  // la salida comparada. Se neutraliza igual que en el navegador para
  // que `Leer` (pseudocódigo) e input() se comporten en modo lote.
  if (effectiveLang === "python") {
    source =
      "import builtins as _b\n_orig_input = _b.input\n_b.input = lambda *a, **k: _orig_input()\n" +
      source;
  }

  const wandboxLang = WANDBOX_LANGUAGE[effectiveLang];
  if (!wandboxLang) {
    return { stdout: "", stderr: `Lenguaje no ejecutable en el servidor: ${language}`, infraError: true };
  }

  try {
    const compiler = await resolveCompiler(wandboxLang);
    if (!compiler) {
      return { stdout: "", stderr: `Sin compilador para ${wandboxLang}.`, infraError: true };
    }

    const response = await fetch(`${WANDBOX_URL}/api/compile.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler, code: source, stdin }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      return { stdout: "", stderr: `Motor de ejecución: ${response.status}`, infraError: true };
    }

    const data = (await response.json()) as {
      program_output?: string;
      program_error?: string;
      compiler_error?: string;
    };
    return {
      stdout: data.program_output ?? "",
      stderr: (data.compiler_error ?? "") + (data.program_error ?? ""),
      infraError: false,
    };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return {
      stdout: "",
      stderr: timeout ? "Tiempo de ejecución excedido." : "No se pudo contactar el motor de ejecución.",
      infraError: true,
    };
  }
}
