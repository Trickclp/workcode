/**
 * Parser: pseudocódigo → AST.
 *
 * Estrategia: análisis línea a línea con una PILA DE BLOQUES.
 * Cada estructura de control (Si, Mientras, Para, Repetir) apila una
 * referencia al arreglo `body` donde deben insertarse las sentencias
 * siguientes. Los cierres (FinSi, FinMientras...) desapilan. Así el
 * anidamiento queda representado en el árbol y el generador solo tiene
 * que recorrerlo en profundidad para producir la indentación de Python.
 */

import {
  IfNode,
  Program,
  RepeatNode,
  Statement,
  TranspileError,
} from "./ast";
import { translateExpression } from "./expression";

interface BlockFrame {
  /** Arreglo donde se insertan las sentencias del nivel actual. */
  body: Statement[];
  /** Palabra clave que cierra este bloque, para diagnósticos. */
  closer: "finsi" | "finmientras" | "finpara" | "hastaque" | "finproceso";
  /** Nodo dueño del bloque (para Sino y Hasta Que). */
  owner: Statement | Program;
  line: number;
}

export interface ParseResult {
  program: Program;
  errors: TranspileError[];
  imports: Set<string>;
  usesRead: boolean;
}

/** Elimina comentarios `//` respetando cadenas entre comillas. */
function stripComment(line: string): { code: string; comment: string | null } {
  let inString: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === inString && line[i - 1] !== "\\") inString = null;
    } else if (ch === '"' || ch === "'") {
      inString = ch;
    } else if (ch === "/" && line[i + 1] === "/") {
      return { code: line.slice(0, i), comment: line.slice(i + 2).trim() };
    }
  }
  return { code: line, comment: null };
}

export function parse(source: string): ParseResult {
  const program: Program = { kind: "Program", name: null, body: [] };
  const errors: TranspileError[] = [];
  const imports = new Set<string>();
  let usesRead = false;

  const stack: BlockFrame[] = [];
  /** Cuerpo activo: tope de la pila o el programa raíz. */
  const currentBody = (): Statement[] =>
    stack.length > 0 ? stack[stack.length - 1].body : program.body;

  const translate = (expr: string, inCondition = false): string => {
    const result = translateExpression(expr, inCondition);
    result.imports.forEach((imp) => imports.add(imp));
    return result.code;
  };

  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const { code, comment } = stripComment(lines[index]);
    const trimmed = code.trim();

    if (comment !== null && trimmed === "") {
      currentBody().push({ kind: "Comment", text: comment, line: lineNumber });
      continue;
    }
    if (trimmed === "") continue;

    let match: RegExpMatchArray | null;

    // ── Encabezado y cierre del algoritmo ────────────────────────────
    if ((match = trimmed.match(/^(?:proceso|algoritmo)\s+([\wÁÉÍÓÚáéíóúÑñ]+)$/i))) {
      program.name = match[1];
      continue;
    }
    if (/^fin\s*(?:proceso|algoritmo)$/i.test(trimmed)) {
      if (stack.length > 0) {
        errors.push({
          line: lineNumber,
          message: `FinProceso encontrado con ${stack.length} bloque(s) sin cerrar (abierto en línea ${stack[stack.length - 1].line}).`,
        });
      }
      continue;
    }

    // ── Condicional: Si <cond> Entonces / Sino / FinSi ───────────────
    if ((match = trimmed.match(/^si\s+(.+?)\s+entonces$/i))) {
      const node: IfNode = {
        kind: "If",
        condition: translate(match[1], true),
        then: [],
        else: [],
        line: lineNumber,
      };
      currentBody().push(node);
      stack.push({ body: node.then, closer: "finsi", owner: node, line: lineNumber });
      continue;
    }
    if (/^si\s*no$|^sino$/i.test(trimmed)) {
      const top = stack[stack.length - 1];
      if (top && top.owner.kind === "If") {
        top.body = (top.owner as IfNode).else; // redirige al bloque else
      } else {
        errors.push({ line: lineNumber, message: "'Sino' sin un 'Si' abierto." });
      }
      continue;
    }
    if (/^fin\s*si$/i.test(trimmed)) {
      popBlock("finsi", lineNumber);
      continue;
    }

    // ── Bucle Mientras <cond> Hacer / FinMientras ────────────────────
    if ((match = trimmed.match(/^mientras\s+(.+?)\s+hacer$/i))) {
      const node: Statement = {
        kind: "While",
        condition: translate(match[1], true),
        body: [],
        line: lineNumber,
      };
      currentBody().push(node);
      stack.push({ body: node.body, closer: "finmientras", owner: node, line: lineNumber });
      continue;
    }
    if (/^fin\s*mientras$/i.test(trimmed)) {
      popBlock("finmientras", lineNumber);
      continue;
    }

    // ── Bucle Para i <- a Hasta b [Con Paso c] Hacer / FinPara ───────
    if (
      (match = trimmed.match(
        /^para\s+([\wÁÉÍÓÚáéíóúÑñ]+)\s*(?:<-|=)\s*(.+?)\s+hasta\s+(.+?)(?:\s+con\s+paso\s+(.+?))?\s+hacer$/i
      ))
    ) {
      const node: Statement = {
        kind: "For",
        variable: match[1],
        start: translate(match[2]),
        end: translate(match[3]),
        step: match[4] ? translate(match[4]) : null,
        body: [],
        line: lineNumber,
      };
      currentBody().push(node);
      stack.push({ body: node.body, closer: "finpara", owner: node, line: lineNumber });
      continue;
    }
    if (/^fin\s*para$/i.test(trimmed)) {
      popBlock("finpara", lineNumber);
      continue;
    }

    // ── Repetir ... Hasta Que <cond> ─────────────────────────────────
    if (/^repetir$/i.test(trimmed)) {
      const node: RepeatNode = {
        kind: "Repeat",
        condition: "True",
        body: [],
        line: lineNumber,
      };
      currentBody().push(node);
      stack.push({ body: node.body, closer: "hastaque", owner: node, line: lineNumber });
      continue;
    }
    if ((match = trimmed.match(/^hasta\s+que\s+(.+)$/i))) {
      const top = stack[stack.length - 1];
      if (top && top.owner.kind === "Repeat") {
        (top.owner as RepeatNode).condition = translate(match[1], true);
        stack.pop();
      } else {
        errors.push({ line: lineNumber, message: "'Hasta Que' sin un 'Repetir' abierto." });
      }
      continue;
    }

    // ── Escritura: Escribir / Imprimir / Mostrar [Sin Saltar] ────────
    if ((match = trimmed.match(/^(?:escribir|imprimir|mostrar)(\s+sin\s+saltar)?\s+(.+)$/i))) {
      currentBody().push({
        kind: "Write",
        args: splitTopLevelCommas(match[2]).map((arg) => translate(arg)),
        newline: !match[1],
        line: lineNumber,
      });
      continue;
    }

    // ── Lectura: Leer a, b, c ────────────────────────────────────────
    if ((match = trimmed.match(/^leer\s+(.+)$/i))) {
      usesRead = true;
      currentBody().push({
        kind: "Read",
        targets: splitTopLevelCommas(match[1]).map((t) => t.trim()),
        line: lineNumber,
      });
      continue;
    }

    // ── Declaración: Definir x, y Como Entero ────────────────────────
    if ((match = trimmed.match(/^definir\s+(.+?)\s+como\s+([\wÁÉÍÓÚáéíóúÑñ]+)$/i))) {
      currentBody().push({
        kind: "Declare",
        names: splitTopLevelCommas(match[1]).map((n) => n.trim()),
        type: match[2].toLowerCase(),
        line: lineNumber,
      });
      continue;
    }

    // ── Asignación: x <- expr  (o  x = expr) ─────────────────────────
    if (
      (match = trimmed.match(
        /^([\wÁÉÍÓÚáéíóúÑñ]+(?:\[[^\]]+\])?)\s*(?:<-|=)\s*(.+)$/
      ))
    ) {
      currentBody().push({
        kind: "Assign",
        target: match[1],
        value: translate(match[2]),
        line: lineNumber,
      });
      continue;
    }

    errors.push({
      line: lineNumber,
      message: `No se reconoce la instrucción: "${trimmed}"`,
    });
  }

  // Bloques que quedaron abiertos al terminar el archivo
  for (const frame of stack) {
    errors.push({
      line: frame.line,
      message: `Bloque abierto en la línea ${frame.line} sin su cierre (${closerName(frame.closer)}).`,
    });
  }

  return { program, errors, imports, usesRead };

  function popBlock(expected: BlockFrame["closer"], line: number): void {
    const top = stack[stack.length - 1];
    if (!top) {
      errors.push({ line, message: `${closerName(expected)} sin bloque abierto.` });
      return;
    }
    if (top.closer !== expected) {
      errors.push({
        line,
        message: `Se esperaba ${closerName(top.closer)} (bloque abierto en línea ${top.line}), pero se encontró ${closerName(expected)}.`,
      });
    }
    stack.pop();
  }
}

function closerName(closer: BlockFrame["closer"]): string {
  const names: Record<string, string> = {
    finsi: "FinSi",
    finmientras: "FinMientras",
    finpara: "FinPara",
    hastaque: "Hasta Que",
    finproceso: "FinProceso",
  };
  return names[closer];
}

/** Divide por comas de nivel superior (ignora comas dentro de "..." y paréntesis). */
function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString: '"' | "'" | null = null;
  let current = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      current += ch;
      if (ch === inString && input[i - 1] !== "\\") inString = null;
    } else if (ch === '"' || ch === "'") {
      inString = ch;
      current += ch;
    } else if (ch === "(" || ch === "[") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}
