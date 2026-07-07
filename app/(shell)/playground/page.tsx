"use client";

import Link from "next/link";
import { LANGUAGES } from "@/lib/runtimes";

/**
 * Pantalla inicial: grid de tarjetas de lenguajes. Cada tarjeta abre
 * un editor temporal con ejecución inmediata en el navegador.
 */
export default function PlaygroundPage() {
  return (
    <div className="page">
      <h1>Playground</h1>
      <p className="page-subtitle">
        Elige un entorno y prueba código al instante. Todo se ejecuta en tu navegador — sin
        servidores, sin esperas.
      </p>

      <div className="lang-grid">
        {LANGUAGES.map((lang) =>
          lang.available ? (
            <Link
              key={lang.id}
              href={`/playground/${lang.id}`}
              className="lang-card"
              style={{ borderTopColor: lang.accent }}
            >
              <div className="lang-badge" style={{ color: lang.accent }}>
                {lang.badge}
              </div>
              <h3>{lang.label}</h3>
              <p>{lang.tagline}</p>
              <span className="lang-cta">Abrir editor →</span>
            </Link>
          ) : (
            <div key={lang.id} className="lang-card disabled" style={{ borderTopColor: lang.accent }}>
              <div className="lang-badge" style={{ color: lang.accent }}>
                {lang.badge}
              </div>
              <h3>{lang.label}</h3>
              <p>{lang.tagline}</p>
              <span className="lang-cta">Próximamente</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
