/**
 * Registro central de lenguajes de Work.Code: alimenta las tarjetas del
 * Playground, los selectores de "Crear Tarea" y el despachador runCode()
 * que usan el editor, el evaluador y el Playground.
 *
 * kind: "local"  → Pyodide / Web Worker / WASM en el navegador.
 * kind: "remote" → servicio de compilación vía POST /api/execute.
 */

import { runJavaScript } from "./javascript";
import { runPseudocode } from "./pseudocode";
import { runPython } from "./python";
import { runRemote } from "./remote";
import { runSql } from "./sql";
import { runTypeScript } from "./typescript";
import { LanguageInfo, RunIO, RuntimeId, RuntimeKind } from "./types";

export const LANGUAGES: LanguageInfo[] = [
  {
    id: "translator",
    label: "Pseudo → Python",
    tagline: "El traductor original: pseudocódigo a Python en vivo, con AST propio.",
    badge: "⇄",
    accent: "#4ec9b0",
    available: true,
    debuggable: false,
    kind: "local",
    sample: "",
  },
  {
    id: "pseudocode",
    label: "Pseudocódigo",
    tagline: "Sintaxis en español estilo PSeInt. Se ejecuta transpilando a Python.",
    badge: "Ps",
    accent: "#dcdcaa",
    available: true,
    debuggable: false,
    kind: "local",
    sample: `Proceso SumaAcumulada
	Definir total Como Entero
	total <- 0
	Para i <- 1 Hasta 5 Hacer
		total <- total + i
		Escribir "Suma parcial: ", total
	FinPara
FinProceso`,
  },
  {
    id: "python",
    label: "Python 3.12",
    tagline: "CPython real en tu navegador vía Pyodide (WebAssembly). Incluye debugger.",
    badge: "Py",
    accent: "#569cd6",
    available: true,
    debuggable: true,
    kind: "local",
    sample: `def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        print(a)
        a, b = b, a + b

fibonacci(8)`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    tagline: "Ejecución nativa en un Web Worker aislado del navegador.",
    badge: "JS",
    accent: "#f1e05a",
    available: true,
    debuggable: false,
    kind: "local",
    sample: `function tabla(n) {
  for (let i = 1; i <= 5; i++) {
    console.log(\`\${n} x \${i} = \${n * i}\`);
  }
}

tabla(7);`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    tagline: "Transpilado en el navegador con Sucrase y ejecutado en Worker aislado.",
    badge: "TS",
    accent: "#3178c6",
    available: true,
    debuggable: false,
    kind: "local",
    sample: `interface Alumno {
  nombre: string;
  nota: number;
}

const curso: Alumno[] = [
  { nombre: "Ana", nota: 6.5 },
  { nombre: "Luis", nota: 3.9 },
];

for (const a of curso) {
  console.log(\`\${a.nombre}: \${a.nota >= 4.0 ? "aprueba" : "reprueba"}\`);
}`,
  },
  {
    id: "sql",
    label: "SQL (SQLite)",
    tagline: "SQLite real compilado a WebAssembly (sql.js). Base en memoria por ejecución.",
    badge: "SQL",
    accent: "#e38c00",
    available: true,
    debuggable: false,
    kind: "local",
    sample: `CREATE TABLE alumnos (nombre TEXT, nota REAL);

INSERT INTO alumnos VALUES
  ('Ana', 6.5),
  ('Luis', 3.9),
  ('Tomy', 7.0);

SELECT nombre, nota,
       CASE WHEN nota >= 4.0 THEN 'aprueba' ELSE 'reprueba' END AS estado
FROM alumnos
ORDER BY nota DESC;`,
  },
  {
    id: "c",
    label: "C (GCC)",
    tagline: "Compilación y ejecución en el servicio remoto de Work.Code.",
    badge: "C",
    accent: "#6295cb",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 5; i++) {
        printf("%d al cuadrado = %d\\n", i, i * i);
    }
    return 0;
}`,
  },
  {
    id: "cpp",
    label: "C++ (G++)",
    tagline: "Compilación y ejecución en el servicio remoto de Work.Code.",
    badge: "C++",
    accent: "#f34b7d",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `#include <iostream>
#include <vector>

int main() {
    std::vector<double> notas = {6.5, 3.9, 7.0};
    double suma = 0;
    for (double n : notas) suma += n;
    std::cout << "Promedio: " << suma / notas.size() << std::endl;
    return 0;
}`,
  },
  {
    id: "java",
    label: "Java",
    tagline: "OpenJDK en el servicio remoto. La clase pública debe llamarse Main.",
    badge: "Jv",
    accent: "#b07219",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `public class Main {
    public static void main(String[] args) {
        double[] notas = {6.5, 3.9, 7.0};
        double suma = 0;
        for (double n : notas) suma += n;
        System.out.printf("Promedio: %.2f%n", suma / notas.length);
    }
}`,
  },
  {
    id: "rust",
    label: "Rust",
    tagline: "rustc en el servicio remoto de Work.Code.",
    badge: "Rs",
    accent: "#dea584",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `fn main() {
    let notas = [6.5, 3.9, 7.0];
    let promedio: f64 = notas.iter().sum::<f64>() / notas.len() as f64;
    println!("Promedio: {:.2}", promedio);
}`,
  },
  {
    id: "go",
    label: "Go",
    tagline: "Compilador oficial de Go en el servicio remoto.",
    badge: "Go",
    accent: "#00add8",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `package main

import "fmt"

func main() {
	notas := []float64{6.5, 3.9, 7.0}
	suma := 0.0
	for _, n := range notas {
		suma += n
	}
	fmt.Printf("Promedio: %.2f\\n", suma/float64(len(notas)))
}`,
  },
  {
    id: "php",
    label: "PHP",
    tagline: "Intérprete PHP en el servicio remoto de Work.Code.",
    badge: "PHP",
    accent: "#4f5d95",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `<?php
$notas = [6.5, 3.9, 7.0];
echo "Promedio: " . round(array_sum($notas) / count($notas), 2) . "\\n";`,
  },
  {
    id: "ruby",
    label: "Ruby",
    tagline: "Intérprete Ruby en el servicio remoto de Work.Code.",
    badge: "Rb",
    accent: "#701516",
    available: true,
    debuggable: false,
    kind: "remote",
    sample: `notas = [6.5, 3.9, 7.0]
puts "Promedio: #{(notas.sum / notas.size.to_f).round(2)}"`,
  },
];

export function getLanguage(id: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

/** Lenguaje Monaco a usar por cada runtime (resaltado + autocompletado). */
export const MONACO_LANGUAGE: Record<RuntimeId, string> = {
  translator: "pseudocode",
  pseudocode: "pseudocode",
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  sql: "sql",
  c: "c",
  cpp: "cpp",
  java: "java",
  rust: "rust",
  go: "go",
  php: "php",
  ruby: "ruby",
};

export async function runCode(
  language: RuntimeId,
  code: string,
  io: RunIO
): Promise<void> {
  switch (language) {
    case "pseudocode":
      return runPseudocode(code, io);
    case "python":
      return runPython(code, io);
    case "javascript":
      return runJavaScript(code, io);
    case "typescript":
      return runTypeScript(code, io);
    case "sql":
      return runSql(code, io);
    case "c":
    case "cpp":
    case "java":
    case "rust":
    case "go":
    case "php":
    case "ruby":
      return runRemote(language, code, io);
    default:
      io.onStderr(`El entorno "${language}" todavía no soporta ejecución.`);
  }
}

export type { LanguageInfo, RunIO, RuntimeId, RuntimeKind };
