/**
 * Definición del Árbol de Sintaxis Abstracta (AST).
 *
 * El parser convierte el pseudocódigo en estos nodos; el generador
 * los recorre recursivamente emitiendo Python con la indentación
 * correcta según la profundidad de anidamiento.
 */

export interface Program {
  kind: "Program";
  name: string | null;
  body: Statement[];
}

export interface WriteNode {
  kind: "Write";
  args: string[]; // expresiones ya traducidas a Python
  newline: boolean; // false para "Escribir Sin Saltar"
  line: number;
}

export interface ReadNode {
  kind: "Read";
  targets: string[];
  line: number;
}

export interface AssignNode {
  kind: "Assign";
  target: string;
  value: string;
  line: number;
}

export interface DeclareNode {
  kind: "Declare";
  names: string[];
  type: string; // Entero | Real | Caracter | Logico
  line: number;
}

export interface IfNode {
  kind: "If";
  condition: string;
  then: Statement[];
  else: Statement[];
  line: number;
}

export interface WhileNode {
  kind: "While";
  condition: string;
  body: Statement[];
  line: number;
}

export interface ForNode {
  kind: "For";
  variable: string;
  start: string;
  end: string;
  step: string | null;
  body: Statement[];
  line: number;
}

/** Repetir ... Hasta Que <cond>  →  while True: ... if cond: break */
export interface RepeatNode {
  kind: "Repeat";
  condition: string; // se completa al encontrar "Hasta Que"
  body: Statement[];
  line: number;
}

export interface CommentNode {
  kind: "Comment";
  text: string;
  line: number;
}

export type Statement =
  | WriteNode
  | ReadNode
  | AssignNode
  | DeclareNode
  | IfNode
  | WhileNode
  | ForNode
  | RepeatNode
  | CommentNode;

export interface TranspileError {
  line: number;
  message: string;
}
