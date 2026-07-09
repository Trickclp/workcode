"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/shell/Logo";
import { LANGUAGES } from "@/lib/runtimes";
import { useAuth } from "@/lib/auth/store";

/**
 * Página principal pública de Work.Code. Se llega al hacer clic en el
 * logo desde cualquier parte. Presenta la plataforma y lleva a crear
 * cuenta / iniciar sesión (o de vuelta a la app si ya hay sesión).
 */

const FEATURES = [
  {
    icon: "🌐",
    title: "13 lenguajes reales",
    text: "Pseudocódigo, Python, JavaScript, TypeScript, SQL, C, C++, Java, Rust, Go, PHP y Ruby — con ejecución real, no simulada.",
  },
  {
    icon: "🤖",
    title: "Auto-evaluación instantánea",
    text: "El profesor define casos de prueba y la plataforma califica cada entrega al momento, con la escala de notas que él elija.",
  },
  {
    icon: "🐞",
    title: "Debugger visual",
    text: "Ejecuta tu código paso a paso, viendo la línea actual y el valor de cada variable en memoria.",
  },
  {
    icon: "✨",
    title: "AI Tutor",
    text: "Cuando tu programa falla, un tutor te guía con preguntas para que encuentres el error tú mismo — sin darte la respuesta.",
  },
  {
    icon: "🧑‍🏫",
    title: "Hecho para clases",
    text: "Clases con código de invitación, plazos con penalización por atraso, revisión manual y exportación de notas a Excel.",
  },
  {
    icon: "⚡",
    title: "Sin instalar nada",
    text: "Todo corre en el navegador — en tu computador o tu celular. Crear una cuenta toma 20 segundos.",
  },
];

const STEPS = [
  { n: "1", title: "Crea tu cuenta", text: "Con Google o con tu correo, y elige tu rol: Alumno o Profesor." },
  { n: "2", title: "Únete a tu clase", text: "Con el código que comparte tu profesor (o crea tu clase si enseñas)." },
  { n: "3", title: "Programa y entrega", text: "Resuelve en el editor, prueba tu código y entrégalo con un clic." },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  // Usuarios de Google recién creados aún sin rol → onboarding.
  useEffect(() => {
    if (hydrated && user && !user.role) router.replace("/onboarding");
  }, [hydrated, user, router]);

  const loggedIn = Boolean(user?.role);

  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" aria-label="Inicio">
          <Logo size={30} />
        </Link>
        <nav className="landing-nav">
          {loggedIn ? (
            <Link className="btn primary" href="/playground">
              Ir a la app →
            </Link>
          ) : (
            <>
              <Link className="btn ghost" href="/login">
                Iniciar sesión
              </Link>
              <Link className="btn primary" href="/login#registro">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <h1>
          Programa, entrega y califica.
          <br />
          <span>Todo en el navegador.</span>
        </h1>
        <p>
          Work.Code es la plataforma donde alumnos y profesores universitarios escriben,
          ejecutan y evalúan código — con auto-corrección instantánea, debugger visual y un
          tutor de IA que enseña sin dar las respuestas.
        </p>
        <div className="landing-cta">
          {loggedIn ? (
            <Link className="btn primary big" href="/playground">
              Continuar donde quedaste →
            </Link>
          ) : (
            <>
              <Link className="btn primary big" href="/login#registro">
                Crear cuenta gratis
              </Link>
              <Link className="btn ghost big" href="/login">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
        <div className="landing-langs">
          {LANGUAGES.filter((l) => l.id !== "translator").map((lang) => (
            <span key={lang.id} className="landing-lang" style={{ color: lang.accent }}>
              {lang.badge}
            </span>
          ))}
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing-feature">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      <section className="landing-steps">
        <h2>Cómo funciona</h2>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="step-number">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <Logo size={22} />
        <span>Plataforma IDE educativa · © 2026</span>
      </footer>
    </div>
  );
}
