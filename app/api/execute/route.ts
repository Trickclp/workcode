import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Endpoint de ejecución remota de Work.Code (C, C++, Java, Rust, Go,
 * PHP, Ruby). Arquitectura de proveedores intercambiables vía env:
 *
 *  EXECUTION_PROVIDER=wandbox (default)
 *    API pública y gratuita de Wandbox (https://wandbox.org). El
 *    compilador de cada lenguaje se descubre en runtime desde
 *    /api/list.json y se cachea en memoria del proceso.
 *
 *  EXECUTION_PROVIDER=piston + EXECUTION_API_URL=http://tu-host/api/v2
 *    Para producción: instancia autoalojada de Piston (Docker).
 *    (La instancia pública emkc.org es solo-whitelist desde 02/2026.)
 *
 * Mantener esto en el servidor evita CORS y permite añadir rate-limit
 * y auditoría por usuario cuando se conecte la base de datos.
 */

const PROVIDER = process.env.EXECUTION_PROVIDER ?? "wandbox";
const WANDBOX_URL = process.env.EXECUTION_API_URL ?? "https://wandbox.org";
const PISTON_URL = process.env.EXECUTION_API_URL ?? "https://emkc.org/api/v2/piston";

interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
}

// ── Proveedor Wandbox ──────────────────────────────────────────────

const WANDBOX_LANGUAGE: Record<string, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  rust: "Rust",
  go: "Go",
  php: "PHP",
  ruby: "Ruby",
};

let wandboxCompilers: Record<string, string> | null = null;

async function resolveWandboxCompiler(language: string): Promise<string | null> {
  if (!wandboxCompilers) {
    const response = await fetch(`${WANDBOX_URL}/api/list.json`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Wandbox list: ${response.status}`);
    const list = (await response.json()) as { name: string; language: string }[];

    wandboxCompilers = {};
    for (const [id, wandboxLang] of Object.entries(WANDBOX_LANGUAGE)) {
      const matches = list.filter((c) => c.language === wandboxLang);
      // Versión estable; las "head" (nightly) suelen fallar al ejecutar.
      const compiler = matches.find((c) => !c.name.includes("head")) ?? matches[0];
      if (compiler) wandboxCompilers[id] = compiler.name;
    }
  }
  return wandboxCompilers[language] ?? null;
}

async function executeWandbox(
  language: string,
  code: string,
  stdin: string
): Promise<ExecutionResult | { error: string }> {
  const compiler = await resolveWandboxCompiler(language);
  if (!compiler) return { error: `Wandbox no ofrece compilador para "${language}".` };

  const response = await fetch(`${WANDBOX_URL}/api/compile.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const text = await response.text();
    return { error: `Wandbox: ${response.status} — ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as {
    program_output?: string;
    program_error?: string;
    compiler_error?: string;
  };

  return {
    stdout: data.program_output ?? "",
    stderr: data.program_error ?? "",
    compileOutput: data.compiler_error ?? "",
  };
}

// ── Proveedor Piston (autoalojado) ─────────────────────────────────

const PISTON_LANGUAGES: Record<string, { language: string; fileName: string }> = {
  c: { language: "c", fileName: "main.c" },
  cpp: { language: "c++", fileName: "main.cpp" },
  java: { language: "java", fileName: "Main.java" },
  rust: { language: "rust", fileName: "main.rs" },
  go: { language: "go", fileName: "main.go" },
  php: { language: "php", fileName: "main.php" },
  ruby: { language: "ruby", fileName: "main.rb" },
};

async function executePiston(
  language: string,
  code: string,
  stdin: string
): Promise<ExecutionResult | { error: string }> {
  const target = PISTON_LANGUAGES[language];
  if (!target) return { error: `Piston no está mapeado para "${language}".` };

  const response = await fetch(`${PISTON_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: target.language,
      version: "*",
      files: [{ name: target.fileName, content: code }],
      stdin,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const text = await response.text();
    return { error: `Motor Piston: ${response.status} — ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as {
    run?: { stdout: string; stderr: string; code: number };
    compile?: { stdout: string; stderr: string; code: number };
  };
  const compileFailed = data.compile && data.compile.code !== 0;

  return {
    stdout: compileFailed ? "" : data.run?.stdout ?? "",
    stderr: compileFailed ? "" : data.run?.stderr ?? "",
    compileOutput: data.compile?.stderr || (compileFailed ? data.compile?.stdout ?? "" : ""),
  };
}

// ── Handler ────────────────────────────────────────────────────────

const MAX_CODE_BYTES = 100_000; // ~100 KB: evita abuso como relay de cómputo
const MAX_STDIN_BYTES = 50_000;

export async function POST(request: Request) {
  // Solo usuarios autenticados: el motor remoto no es un servicio público.
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { language?: string; code?: string; stdin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const { language, code, stdin } = body;
  if (!language || typeof code !== "string") {
    return NextResponse.json({ error: "Faltan language o code." }, { status: 400 });
  }
  if (code.length > MAX_CODE_BYTES || (stdin?.length ?? 0) > MAX_STDIN_BYTES) {
    return NextResponse.json({ error: "El código o la entrada exceden el límite permitido." }, { status: 413 });
  }

  try {
    const result =
      PROVIDER === "piston"
        ? await executePiston(language, code, stdin ?? "")
        : await executeWandbox(language, code, stdin ?? "");

    if ("error" in result) {
      return NextResponse.json(result, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timeout
          ? "El motor de ejecución tardó demasiado."
          : "No se pudo contactar el motor de ejecución.",
      },
      { status: 504 }
    );
  }
}
