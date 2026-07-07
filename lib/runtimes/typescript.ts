import { transform } from "sucrase";
import { runJavaScript } from "./javascript";
import { RunIO } from "./types";

/**
 * TypeScript: se transpila a JavaScript en el navegador con Sucrase
 * (sin verificación de tipos, como esbuild) y se ejecuta en el mismo
 * Web Worker aislado del runtime de JavaScript.
 */
export async function runTypeScript(code: string, io: RunIO): Promise<void> {
  let js: string;
  try {
    js = transform(code, { transforms: ["typescript"] }).code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.onStderr(`Error de sintaxis TypeScript: ${message}`);
    return;
  }
  await runJavaScript(js, io);
}
