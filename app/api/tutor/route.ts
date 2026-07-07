import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * AI Tutor con Claude (opcional).
 *
 * Requiere ANTHROPIC_API_KEY en .env.local. Si no está configurada,
 * responde 503 y el cliente usa el tutor local basado en heurísticas
 * (lib/tutor/heuristics.ts), así la funcionalidad nunca se rompe.
 */

const SOCRATIC_SYSTEM = `Eres un tutor de programación para estudiantes principiantes hispanohablantes.
Recibirás el código de un estudiante y el error que produjo su ejecución.

Reglas estrictas:
- NUNCA des el código corregido ni digas exactamente qué cambiar. Tu meta es que el estudiante descubra el error por sí mismo.
- Explica QUÉ significa el error en lenguaje simple (una analogía breve ayuda).
- Da 2 o 3 pistas en forma de preguntas guía (método socrático), ordenadas de más general a más específica.
- Si el error indica una línea, referénciala.
- Tono cálido y alentador, sin condescendencia.`;

const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Nombre corto del tipo de error, en español",
    },
    meaning: {
      type: "string",
      description: "Explicación pedagógica de qué significa el error (2-3 frases)",
    },
    hints: {
      type: "array",
      items: { type: "string" },
      description: "2-3 preguntas guía socráticas, sin revelar la solución",
    },
    line: {
      anyOf: [{ type: "integer" }, { type: "null" }],
      description: "Línea donde ocurre el error, si se puede determinar",
    },
  },
  required: ["title", "meaning", "hints", "line"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI Tutor no configurado (falta ANTHROPIC_API_KEY)" },
      { status: 503 }
    );
  }

  try {
    const { stderr, code, language } = (await request.json()) as {
      stderr: string;
      code: string;
      language: string;
    };

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500, // salida deliberadamente corta y estructurada
      thinking: { type: "adaptive" },
      system: SOCRATIC_SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: ADVICE_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Lenguaje: ${language}\n\nCódigo del estudiante:\n\`\`\`\n${code}\n\`\`\`\n\nError de la terminal:\n\`\`\`\n${stderr}\n\`\`\``,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "solicitud rechazada" }, { status: 502 });
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "respuesta vacía" }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (error) {
    console.error("[tutor] error:", error);
    return NextResponse.json({ error: "fallo del tutor IA" }, { status: 500 });
  }
}
