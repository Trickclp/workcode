/**
 * Registro del lenguaje "pseudocode" en Monaco Editor:
 *  1. Tokenizador Monarch → resaltado de sintaxis (colores tipo VS Code).
 *  2. Configuración de lenguaje → comentarios //, auto-cierre de comillas.
 *  3. CompletionItemProvider → autocompletado con snippets de bloques.
 */

import type { Monaco } from "@monaco-editor/react";
import type { editor, Position } from "monaco-editor";

export const PSEUDOCODE_LANGUAGE_ID = "pseudocode";

const KEYWORDS = [
  "Proceso", "FinProceso", "Algoritmo", "FinAlgoritmo",
  "Si", "Entonces", "Sino", "FinSi",
  "Mientras", "Hacer", "FinMientras",
  "Para", "Hasta", "Con", "Paso", "FinPara",
  "Repetir", "Que",
  "Definir", "Como",
];

const IO_KEYWORDS = ["Escribir", "Imprimir", "Mostrar", "Leer", "Sin", "Saltar"];
const TYPE_KEYWORDS = ["Entero", "Real", "Caracter", "Cadena", "Texto", "Logico", "Numero"];
const OPERATOR_WORDS = ["Y", "O", "NO", "MOD", "Verdadero", "Falso"];
const BUILTINS = ["Longitud", "Abs", "Trunc", "Redon", "Raiz", "Sen", "Cos", "Azar", "Mayusculas", "Minusculas"];

let registered = false;

export function registerPseudocodeLanguage(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: PSEUDOCODE_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(PSEUDOCODE_LANGUAGE_ID, {
    ignoreCase: true,
    keywords: KEYWORDS.map((k) => k.toLowerCase()),
    ioKeywords: IO_KEYWORDS.map((k) => k.toLowerCase()),
    typeKeywords: TYPE_KEYWORDS.map((k) => k.toLowerCase()),
    operatorWords: OPERATOR_WORDS.map((k) => k.toLowerCase()),
    builtins: BUILTINS.map((k) => k.toLowerCase()),

    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [
          /[a-zA-ZÁÉÍÓÚáéíóúÑñÜü_][\wÁÉÍÓÚáéíóúÑñÜü]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@ioKeywords": "keyword.io",
              "@typeKeywords": "type",
              "@operatorWords": "keyword.operator",
              "@builtins": "support.function",
              "@default": "identifier",
            },
          },
        ],
        [/<-|<=|>=|<>|[=<>+\-*\/^%&]/, "operator"],
        [/[()\[\],]/, "delimiter"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(PSEUDOCODE_LANGUAGE_ID, {
    comments: { lineComment: "//" },
    brackets: [
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.registerCompletionItemProvider(PSEUDOCODE_LANGUAGE_ID, {
    provideCompletionItems: (model: editor.ITextModel, position: Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const snippet = (
        label: string,
        insertText: string,
        documentation: string
      ) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText,
        insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation,
        range,
      });

      const keyword = (label: string) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: label,
        range,
      });

      return {
        suggestions: [
          snippet(
            "Si...Entonces",
            "Si ${1:condicion} Entonces\n\t$0\nFinSi",
            "Bloque condicional"
          ),
          snippet(
            "Si...Sino",
            "Si ${1:condicion} Entonces\n\t$2\nSino\n\t$0\nFinSi",
            "Condicional con alternativa"
          ),
          snippet(
            "Mientras",
            "Mientras ${1:condicion} Hacer\n\t$0\nFinMientras",
            "Bucle mientras la condición sea verdadera"
          ),
          snippet(
            "Para",
            "Para ${1:i} <- ${2:1} Hasta ${3:10} Hacer\n\t$0\nFinPara",
            "Bucle con contador (Hasta es inclusivo)"
          ),
          snippet(
            "Repetir",
            "Repetir\n\t$0\nHasta Que ${1:condicion}",
            "Bucle que se ejecuta al menos una vez"
          ),
          snippet("Escribir", 'Escribir "${1:mensaje}"', "Imprime en la consola"),
          snippet("Leer", "Leer ${1:variable}", "Lee un valor del usuario"),
          snippet(
            "Definir",
            "Definir ${1:variable} Como ${2:Entero}",
            "Declara una variable con tipo"
          ),
          snippet(
            "Proceso",
            "Proceso ${1:MiPrograma}\n\t$0\nFinProceso",
            "Estructura principal del algoritmo"
          ),
          ...KEYWORDS.map(keyword),
          ...TYPE_KEYWORDS.map(keyword),
          ...OPERATOR_WORDS.map(keyword),
        ],
      };
    },
  });
}
