import { RunIO, RuntimeId } from "./types";

/**
 * Cliente del servicio de ejecución remota (lenguajes compilados:
 * C, C++, Java, Rust, Go, PHP, Ruby). Llama a nuestro endpoint
 * POST /api/execute, que actúa de proxy hacia el motor configurado
 * (por defecto la API pública de Piston; ver .env.example).
 */
export async function runRemote(language: RuntimeId, code: string, io: RunIO): Promise<void> {
  try {
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        code,
        stdin: (io.stdinLines ?? []).join("\n"),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = (await response.json()) as {
      stdout?: string;
      stderr?: string;
      compileOutput?: string;
      error?: string;
    };

    if (!response.ok) {
      io.onStderr(data.error ?? `El servicio de ejecución respondió ${response.status}.`);
      return;
    }

    if (data.compileOutput?.trim()) io.onStderr(data.compileOutput.trimEnd());
    if (data.stdout?.trim() || data.stdout === "") {
      const lines = (data.stdout ?? "").replace(/\n$/, "");
      if (lines !== "") lines.split("\n").forEach((line) => io.onStdout(line));
    }
    if (data.stderr?.trim()) io.onStderr(data.stderr.trimEnd());
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    io.onStderr(
      timeout
        ? "El servicio de ejecución remota tardó demasiado (30s)."
        : "No se pudo contactar el servicio de ejecución remota. Verifica tu conexión a internet."
    );
  }
}
