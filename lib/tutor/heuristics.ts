/**
 * AI Tutor — motor local (funciona sin conexión ni API key).
 *
 * Analiza el traceback/stack y produce una explicación pedagógica con
 * preguntas guía estilo socrático: orienta al estudiante hacia el
 * error SIN darle la corrección directa. Si hay una API key de
 * Anthropic configurada, lib/tutor/index.ts usa la IA y esto queda
 * como respaldo.
 */

import { RuntimeId } from "../runtimes/types";

export interface TutorAdvice {
  source: "local" | "ia";
  title: string;
  meaning: string;
  hints: string[];
  line: number | null;
}

interface Pattern {
  match: RegExp;
  title: string;
  meaning: string;
  hints: string[];
}

const PYTHON_PATTERNS: Pattern[] = [
  {
    match: /IndentationError/,
    title: "Error de indentación",
    meaning:
      "Python usa los espacios al inicio de cada línea para saber qué instrucciones pertenecen a un bloque (if, for, while, def). Aquí hay una línea cuya sangría no coincide con su bloque.",
    hints: [
      "Mira la línea señalada: ¿cuántos espacios tiene al inicio comparada con la línea anterior?",
      "¿Todas las líneas dentro del mismo bloque tienen exactamente la misma sangría?",
      "¿Mezclaste tabulaciones con espacios? Elige uno solo.",
    ],
  },
  {
    match: /SyntaxError/,
    title: "Error de sintaxis",
    meaning:
      "Python no pudo entender la estructura de una línea: hay algo escrito de una forma que el lenguaje no reconoce.",
    hints: [
      "Revisa la línea indicada: ¿termina con dos puntos (:) si es un if, for, while o def?",
      "Cuenta paréntesis, corchetes y comillas: ¿cada uno que abre tiene su pareja que cierra?",
      "¿Falta o sobra algún operador entre dos valores?",
    ],
  },
  {
    match: /NameError.*name '(\w+)'/,
    title: "Variable no definida",
    meaning:
      "Se intentó usar un nombre que Python no conoce en ese momento. Las variables deben recibir un valor antes de usarse, y las mayúsculas importan.",
    hints: [
      "¿Escribiste el nombre exactamente igual donde lo creaste? Compara letra por letra, incluidas mayúsculas.",
      "¿La línea que le da valor a esa variable se ejecuta ANTES de la línea que la usa?",
      "Si es una función, ¿la definiste antes de llamarla?",
    ],
  },
  {
    match: /ZeroDivisionError/,
    title: "División entre cero",
    meaning:
      "En algún punto el divisor de una división vale 0, y dividir entre cero no está definido matemáticamente.",
    hints: [
      "¿Qué variable actúa como divisor en la línea señalada? ¿Qué valor tiene justo en ese momento?",
      "¿Puede tu programa llegar a esa línea con el divisor en 0? ¿Qué condición podrías comprobar antes de dividir?",
    ],
  },
  {
    match: /TypeError.*(str|int|float)/,
    title: "Mezcla de tipos incompatibles",
    meaning:
      "Se intentó operar con dos tipos de datos que no se pueden combinar así (por ejemplo, sumar un texto con un número).",
    hints: [
      "¿Qué tipo tiene cada valor de la operación señalada? Prueba imprimir type(variable).",
      "Si uno viene de input(), recuerda que input() SIEMPRE devuelve texto. ¿Cómo se convierte un texto a número?",
    ],
  },
  {
    match: /TypeError/,
    title: "Error de tipo",
    meaning:
      "Una operación o función recibió un valor de un tipo con el que no sabe trabajar.",
    hints: [
      "Lee el mensaje: ¿qué operación falló y qué tipos menciona?",
      "¿Cuántos argumentos espera la función y cuántos le estás pasando?",
    ],
  },
  {
    match: /ValueError/,
    title: "Valor inválido",
    meaning:
      "El tipo del dato era correcto, pero su contenido no. El caso típico: convertir a número un texto que no es numérico, como int(\"hola\").",
    hints: [
      "¿Qué valor exacto llega a la conversión o función que falla? Imprímelo antes de esa línea.",
      "¿Qué pasaría si el usuario escribe letras donde esperas números? ¿Cómo podrías protegerte?",
    ],
  },
  {
    match: /IndexError/,
    title: "Índice fuera de rango",
    meaning:
      "Se intentó acceder a una posición que no existe en la lista. Recuerda que la primera posición es la 0 y la última es longitud - 1.",
    hints: [
      "¿Cuántos elementos tiene la lista en ese momento? ¿Qué índice estás pidiendo?",
      "Si recorres con un bucle, ¿hasta qué valor llega tu contador? ¿Debería llegar a len(lista) o a len(lista) - 1?",
    ],
  },
  {
    match: /KeyError/,
    title: "Clave inexistente en el diccionario",
    meaning: "Se buscó una clave que el diccionario no contiene.",
    hints: [
      "Imprime las claves disponibles con dict.keys(): ¿está la que buscas, escrita exactamente igual?",
      "¿Conoces alguna forma de acceder a una clave con un valor por defecto si no existe?",
    ],
  },
  {
    match: /AttributeError/,
    title: "Atributo o método inexistente",
    meaning:
      "Se llamó a un método o atributo que ese tipo de dato no tiene (o la variable no contiene lo que crees).",
    hints: [
      "¿Qué tipo tiene realmente la variable en esa línea? ¿Es el que esperabas?",
      "¿El método está bien escrito? Python distingue mayúsculas de minúsculas.",
    ],
  },
  {
    match: /ModuleNotFoundError/,
    title: "Módulo no encontrado",
    meaning:
      "Se intentó importar un módulo que no está disponible en este entorno del navegador.",
    hints: [
      "¿El nombre del módulo está bien escrito?",
      "Este entorno (Pyodide) incluye la biblioteca estándar de Python; los paquetes externos requieren instalación aparte.",
    ],
  },
  {
    match: /RecursionError/,
    title: "Recursión infinita",
    meaning:
      "Una función se llamó a sí misma tantas veces que se agotó la pila. Casi siempre falta el caso base o nunca se alcanza.",
    hints: [
      "¿Cuál es la condición que detiene la recursión? ¿Existe?",
      "En cada llamada recursiva, ¿el argumento se acerca realmente al caso base?",
    ],
  },
];

const JS_PATTERNS: Pattern[] = [
  {
    match: /ReferenceError.*?(\w+) is not defined/,
    title: "Variable no definida",
    meaning:
      "Se usó un nombre que JavaScript no conoce en ese punto del programa.",
    hints: [
      "¿Declaraste la variable con let o const antes de usarla?",
      "¿El nombre está escrito exactamente igual? JavaScript distingue mayúsculas.",
    ],
  },
  {
    match: /SyntaxError/,
    title: "Error de sintaxis",
    meaning: "JavaScript no pudo interpretar la estructura del código.",
    hints: [
      "¿Cada llave { tiene su pareja }? ¿Y los paréntesis?",
      "¿Falta una coma o un punto y coma entre dos instrucciones?",
    ],
  },
  {
    match: /TypeError/,
    title: "Error de tipo",
    meaning:
      "Se intentó usar un valor de una forma que su tipo no permite (típico: llamar a algo que no es función, o leer propiedades de undefined).",
    hints: [
      "¿Qué valor tiene exactamente la variable en esa línea? Pruébalo con console.log.",
      "Si es undefined: ¿en qué punto debería haber recibido su valor y por qué no ocurrió?",
    ],
  },
];

const PSEUDO_PATTERNS: Pattern[] = [
  {
    match: /\[Línea \d+\]/,
    title: "Error de pseudocódigo",
    meaning:
      "El transpilador no pudo interpretar una instrucción o hay bloques sin cerrar. El mensaje indica la línea exacta.",
    hints: [
      "¿Cada Si tiene su FinSi? ¿Cada Mientras su FinMientras? ¿Cada Para su FinPara?",
      "¿La instrucción empieza con una palabra clave válida (Escribir, Leer, Si, Mientras, Para, Definir)?",
      "¿Usaste <- para asignar valores?",
    ],
  },
];

const GENERIC: Omit<TutorAdvice, "source" | "line"> = {
  title: "Error de ejecución",
  meaning:
    "El programa se detuvo por un error. El mensaje de la terminal contiene la pista principal: tipo de error y línea donde ocurrió.",
  hints: [
    "Lee la ÚLTIMA línea del error: nombra el tipo de problema.",
    "Busca el número de línea que menciona y revisa esa instrucción y la anterior.",
    "¿Qué valor tenían las variables involucradas justo antes de fallar? El debugger paso a paso puede mostrártelo.",
  ],
};

export function explainLocally(stderr: string, language: RuntimeId): TutorAdvice {
  const patterns =
    language === "javascript"
      ? JS_PATTERNS
      : language === "pseudocode" || language === "translator"
        ? [...PSEUDO_PATTERNS, ...PYTHON_PATTERNS]
        : PYTHON_PATTERNS;

  const lineMatches = [...stderr.matchAll(/(?:line |\[Línea )(\d+)/gi)];
  const line = lineMatches.length > 0
    ? parseInt(lineMatches[lineMatches.length - 1][1], 10)
    : null;

  for (const pattern of patterns) {
    if (pattern.match.test(stderr)) {
      return { source: "local", line, ...pattern };
    }
  }
  return { source: "local", line, ...GENERIC };
}
