import { ImageResponse } from "next/og";

/**
 * Imagen de vista previa (Open Graph) que aparece al compartir el link
 * en WhatsApp, Instagram, X, etc. Se genera dinámicamente — sin archivo
 * binario que mantener.
 */
export const runtime = "edge";
export const alt = "Work.Code — Plataforma IDE Educativa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14243a 0%, #1e1e1e 60%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "linear-gradient(135deg, #4ec9b0, #0e639c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {"</>"}
          </div>
          <div style={{ fontSize: 84, fontWeight: 800 }}>
            Work<span style={{ color: "#4ec9b0" }}>.</span>Code
          </div>
        </div>
        <div style={{ fontSize: 34, marginTop: 30, color: "#c8c8c8" }}>
          Programa, entrega y califica. Todo en el navegador.
        </div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#8fd6c6", display: "flex", gap: 18 }}>
          13 lenguajes · Auto-corrección · Debugger · AI Tutor
        </div>
      </div>
    ),
    size
  );
}
