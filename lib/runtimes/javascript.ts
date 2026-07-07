import { RunIO } from "./types";

const TIMEOUT_MS = 5000;

/**
 * Ejecuta JavaScript en un Web Worker aislado (sin acceso al DOM ni a
 * la sesión). console.log/error se redirigen a la consola simulada y
 * prompt() consume la cola stdin del evaluador.
 */
const WORKER_SOURCE = `
  let stdinQueue = [];
  const send = (type, text) => postMessage({ type, text });
  const fmt = (args) =>
    args.map((a) => {
      if (typeof a === "object" && a !== null) {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    }).join(" ");

  console.log = (...args) => send("stdout", fmt(args));
  console.info = console.log;
  console.warn = (...args) => send("stderr", fmt(args));
  console.error = (...args) => send("stderr", fmt(args));
  self.prompt = () => (stdinQueue.length > 0 ? stdinQueue.shift() : null);
  self.alert = (msg) => send("stdout", String(msg));

  onmessage = (event) => {
    stdinQueue = event.data.stdin || [];
    try {
      new Function(event.data.code)();
    } catch (error) {
      send("stderr", error && error.stack ? error.stack : String(error));
    }
    send("done", "");
  };
`;

export function runJavaScript(code: string, io: RunIO): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve();
    };

    const timer = setTimeout(() => {
      io.onStderr(`Tiempo de ejecución excedido (${TIMEOUT_MS / 1000}s). ¿Hay un bucle infinito?`);
      finish();
    }, TIMEOUT_MS);

    worker.onmessage = (event) => {
      const { type, text } = event.data as { type: string; text: string };
      if (type === "stdout") io.onStdout(text);
      else if (type === "stderr") io.onStderr(text);
      else if (type === "done") finish();
    };

    worker.postMessage({ code, stdin: io.stdinLines ?? [] });
  });
}
