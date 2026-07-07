"use client";

import { TutorAdvice } from "@/lib/tutor";

/**
 * Tarjeta del AI Tutor: explica el error con preguntas guía,
 * sin entregar la solución.
 */
export function TutorCard({ advice, onClose }: { advice: TutorAdvice; onClose: () => void }) {
  return (
    <aside className="tutor-card">
      <div className="tutor-header">
        <span>✨ AI TUTOR</span>
        <button className="icon-button" onClick={onClose} title="Cerrar">
          ✕
        </button>
      </div>

      <h3 className="tutor-title">
        {advice.title}
        {advice.line !== null && <span className="tutor-line"> · línea {advice.line}</span>}
      </h3>

      <p className="tutor-meaning">{advice.meaning}</p>

      <div className="tutor-hints-label">Pistas para encontrarlo tú mismo:</div>
      <ol className="tutor-hints">
        {advice.hints.map((hint, i) => (
          <li key={i}>{hint}</li>
        ))}
      </ol>

      <div className="tutor-footer">
        {advice.source === "ia" ? "Generado por Claude" : "Tutor local (sin conexión)"} · guía sin
        soluciones directas
      </div>
    </aside>
  );
}
