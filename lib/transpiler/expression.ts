/**
 * Traductor de expresiones: convierte una expresión de pseudocódigo
 * a sintaxis Python mediante un escáner léxico (no con replace() ciego,
 * lo que rompería el contenido de las cadenas de texto).
 *
 *   x > 5 Y nombre <> "ana"   →   x > 5 and nombre != "ana"
 *   n MOD 2 = 0               →   n % 2 == 0
 *   raiz(x) + 2 ^ 3           →   math.sqrt(x) + 2 ** 3
 */

const WORD_OPERATORS: Record<string, string> = {
  y: "and",
  o: "or",
  no: "not",
  mod: "%",
  verdadero: "True",
  falso: "False",
};

/** Funciones nativas del pseudocódigo → equivalente Python. */
const BUILTIN_FUNCTIONS: Record<string, { py: string; import?: string }> = {
  longitud: { py: "len" },
  abs: { py: "abs" },
  trunc: { py: "int" },
  redon: { py: "round" },
  raiz: { py: "math.sqrt", import: "math" },
  sen: { py: "math.sin", import: "math" },
  cos: { py: "math.cos", import: "math" },
  azar: { py: "random.randrange", import: "random" },
  convertiranumero: { py: "float" },
  convertiratexto: { py: "str" },
  mayusculas: { py: "str.upper" },
  minusculas: { py: "str.lower" },
};

export interface ExpressionResult {
  code: string;
  imports: Set<string>;
}

type Token = { type: "string" | "number" | "word" | "op" | "ws"; value: string };

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+(?:\.\d+)?)|([A-Za-zÁÉÍÓÚáéíóúÑñÜü_][A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü_]*)|(<-|<=|>=|<>|==|!=|[=<>+\-*\/^%(),\[\]&])|(\s+)/g;

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(expr)) !== null) {
    if (match[1] !== undefined) tokens.push({ type: "string", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "number", value: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: "word", value: match[3] });
    else if (match[4] !== undefined) tokens.push({ type: "op", value: match[4] });
    else tokens.push({ type: "ws", value: " " });
  }
  return tokens;
}

/**
 * @param inCondition si es true, el `=` suelto se traduce como `==`
 *                    (en pseudocódigo la asignación usa `<-`).
 */
export function translateExpression(expr: string, inCondition = false): ExpressionResult {
  const imports = new Set<string>();
  const out: string[] = [];
  const tokens = tokenize(expr);

  for (const token of tokens) {
    switch (token.type) {
      case "string":
      case "number":
      case "ws":
        out.push(token.value);
        break;

      case "word": {
        const lower = token.value.toLowerCase();
        if (WORD_OPERATORS[lower]) {
          out.push(WORD_OPERATORS[lower]);
        } else if (BUILTIN_FUNCTIONS[lower]) {
          const fn = BUILTIN_FUNCTIONS[lower];
          if (fn.import) imports.add(fn.import);
          out.push(fn.py);
        } else {
          out.push(token.value); // identificador del usuario, se conserva
        }
        break;
      }

      case "op":
        if (token.value === "<>") out.push("!=");
        else if (token.value === "^") out.push("**");
        else if (token.value === "&") out.push("+"); // concatenación
        else if (token.value === "=" && inCondition) out.push("==");
        else out.push(token.value);
        break;
    }
  }

  return { code: out.join("").trim(), imports };
}
