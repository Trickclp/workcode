/**
 * Generador de código: AST → Python.
 *
 * Recorrido en profundidad (DFS). Cada nivel de anidamiento del árbol
 * suma un nivel de indentación (4 espacios), por lo que la indentación
 * de Python es un producto directo de la estructura del AST: imposible
 * que quede desalineada.
 */

import { Program, Statement } from "./ast";

const INDENT = "    ";

/** Valor inicial según el tipo declarado con `Definir ... Como ...`. */
const TYPE_DEFAULTS: Record<string, string> = {
  entero: "0",
  real: "0.0",
  numero: "0",
  caracter: '""',
  cadena: '""',
  texto: '""',
  logico: "False",
};

/**
 * Helper inyectado solo cuando el pseudocódigo usa `Leer`:
 * lee de stdin e intenta convertir a número automáticamente.
 */
const READ_HELPER = `def _leer(nombre):
    valor = input(f"Ingrese {nombre}: ")
    try:
        return int(valor)
    except ValueError:
        try:
            return float(valor)
        except ValueError:
            return valor`;

export interface GenerateOptions {
  imports: Set<string>;
  usesRead: boolean;
}

export function generate(program: Program, options: GenerateOptions): string {
  const lines: string[] = [];

  if (program.name) {
    lines.push(`# Algoritmo: ${program.name}`);
  }
  for (const module of Array.from(options.imports).sort()) {
    lines.push(`import ${module}`);
  }
  if (options.usesRead) {
    if (lines.length > 0) lines.push("");
    lines.push(READ_HELPER);
  }
  if (lines.length > 0) lines.push("");

  emitBlock(program.body, 0, lines);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function emitBlock(body: Statement[], level: number, out: string[]): void {
  if (body.length === 0) {
    out.push(indent(level) + "pass");
    return;
  }
  for (const node of body) {
    emitStatement(node, level, out);
  }
}

function emitStatement(node: Statement, level: number, out: string[]): void {
  const pad = indent(level);

  switch (node.kind) {
    case "Comment":
      out.push(`${pad}# ${node.text}`);
      break;

    case "Declare": {
      const defaultValue = TYPE_DEFAULTS[node.type] ?? "None";
      for (const name of node.names) {
        out.push(`${pad}${name} = ${defaultValue}`);
      }
      break;
    }

    case "Assign":
      out.push(`${pad}${node.target} = ${node.value}`);
      break;

    case "Write": {
      const args = node.args.join(", ");
      out.push(
        node.newline
          ? `${pad}print(${args})`
          : `${pad}print(${args}, end="")`
      );
      break;
    }

    case "Read":
      for (const target of node.targets) {
        out.push(`${pad}${target} = _leer(${JSON.stringify(target)})`);
      }
      break;

    case "If":
      out.push(`${pad}if ${node.condition}:`);
      emitBlock(node.then, level + 1, out);
      if (node.else.length > 0) {
        out.push(`${pad}else:`);
        emitBlock(node.else, level + 1, out);
      }
      break;

    case "While":
      out.push(`${pad}while ${node.condition}:`);
      emitBlock(node.body, level + 1, out);
      break;

    case "For": {
      // El "Hasta" del pseudocódigo es inclusivo; range() es exclusivo,
      // por eso se ajusta el límite en la dirección del paso.
      const step = node.step;
      const descending = step !== null && step.trim().startsWith("-");
      const bound = descending ? `(${node.end}) - 1` : `(${node.end}) + 1`;
      const stepArg = step !== null ? `, ${step}` : "";
      out.push(
        `${pad}for ${node.variable} in range(${node.start}, ${bound}${stepArg}):`
      );
      emitBlock(node.body, level + 1, out);
      break;
    }

    case "Repeat":
      out.push(`${pad}while True:`);
      emitBlock(node.body, level + 1, out);
      out.push(`${indent(level + 1)}if ${node.condition}:`);
      out.push(`${indent(level + 2)}break`);
      break;
  }
}

function indent(level: number): string {
  return INDENT.repeat(level);
}
