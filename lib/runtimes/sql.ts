import { RunIO } from "./types";

/**
 * SQL: SQLite real compilado a WebAssembly (sql.js), cargado una sola
 * vez desde CDN. Cada ejecución usa una base de datos en memoria nueva;
 * los resultados de los SELECT se imprimen como tablas de texto.
 */

const SQLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";

interface QueryResult {
  columns: string[];
  values: unknown[][];
}

interface SqlJsDatabase {
  exec(sql: string): QueryResult[];
  close(): void;
}

interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

declare global {
  interface Window {
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise;

  sqlJsPromise = new Promise<SqlJsStatic>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${SQLJS_CDN}sql-wasm.js`;
    script.onload = () => {
      window
        .initSqlJs!({ locateFile: (file) => SQLJS_CDN + file })
        .then(resolve)
        .catch(reject);
    };
    script.onerror = () => reject(new Error("No se pudo descargar sql.js desde el CDN."));
    document.head.appendChild(script);
  });

  return sqlJsPromise;
}

function formatTable(result: QueryResult): string {
  const rows = [result.columns, ...result.values.map((row) => row.map((v) => String(v ?? "NULL")))];
  const widths = result.columns.map((_, col) =>
    Math.max(...rows.map((row) => row[col].length))
  );
  const line = (row: string[]) =>
    row.map((cell, col) => cell.padEnd(widths[col])).join("  |  ");
  const separator = widths.map((w) => "-".repeat(w)).join("--+--");
  return [line(rows[0]), separator, ...rows.slice(1).map(line)].join("\n");
}

export async function runSql(code: string, io: RunIO): Promise<void> {
  let sqlJs: SqlJsStatic;
  try {
    sqlJs = await loadSqlJs();
  } catch (error) {
    io.onStderr(error instanceof Error ? error.message : String(error));
    return;
  }

  const db = new sqlJs.Database();
  try {
    const results = db.exec(code);
    if (results.length === 0) {
      io.onStdout("Sentencias ejecutadas correctamente (sin filas devueltas).");
    }
    for (const result of results) {
      io.onStdout(formatTable(result));
      io.onStdout(`(${result.values.length} fila${result.values.length !== 1 ? "s" : ""})`);
    }
  } catch (error) {
    io.onStderr(`Error SQL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    db.close();
  }
}
