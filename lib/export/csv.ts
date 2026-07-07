"use client";

/**
 * Exportación de datos a CSV compatible con Excel:
 * separador ';' (configuración regional es-*) y BOM UTF-8 para que
 * Excel reconozca acentos y eñes sin pasos intermedios.
 */

const UTF8_BOM = "\uFEFF";

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const csv = UTF8_BOM + rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
