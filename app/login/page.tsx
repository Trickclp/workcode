"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/Logo";
import { Role, useAuth } from "@/lib/auth/store";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated, signInWithGoogle, signInWithPassword, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleChoice] = useState<Role>("alumno");
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false);

  // Google aparece habilitado solo si el servidor tiene las credenciales
  // OAuth configuradas (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(user.role ? "/playground" : "/onboarding");
  }, [hydrated, user, router]);

  // /login#registro (desde la página principal) abre directo "Crear cuenta".
  useEffect(() => {
    if (window.location.hash === "#registro") setMode("register");
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result =
      mode === "login"
        ? await signInWithPassword(email, password)
        : await register(name, email, password, role);
    setError(result);
    setSubmitting(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <Link href="/" aria-label="Página principal">
            <Logo size={42} />
          </Link>
        </div>
        <p className="auth-tagline">
          La plataforma universitaria donde escribes, ejecutas y entregas código.
        </p>

        <button
          className="google-button"
          onClick={signInWithGoogle}
          disabled={!googleEnabled}
          title={
            googleEnabled
              ? ""
              : "Configura AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET en .env para activar Google"
          }
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 34.9 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          Continuar con Google
        </button>

        {!googleEnabled && (
          <div className="google-hint">
            🔒 El botón de Google se activa al configurar tus credenciales OAuth
            (AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET en el archivo .env — guía en DEPLOY.md).
            Mientras tanto, usa tu correo y contraseña. 👇
          </div>
        )}

        <div className="auth-divider">o con tu correo</div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Iniciar sesión
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            Crear cuenta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              className="input"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="correo@universidad.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === "register" && (
            <div className="role-pick">
              <span>Me registro como:</span>
              <label className={role === "alumno" ? "active" : ""}>
                <input
                  type="radio"
                  name="role"
                  checked={role === "alumno"}
                  onChange={() => setRoleChoice("alumno")}
                />
                🎒 Alumno
              </label>
              <label className={role === "profesor" ? "active" : ""}>
                <input
                  type="radio"
                  name="role"
                  checked={role === "profesor"}
                  onChange={() => setRoleChoice("profesor")}
                />
                🧑‍🏫 Profesor
              </label>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="btn primary wide" type="submit" disabled={submitting}>
            {submitting
              ? "Verificando..."
              : mode === "login"
                ? "Entrar"
                : "Crear cuenta y entrar"}
          </button>
        </form>

        <div className="auth-note">
          Autenticación real con NextAuth: las cuentas viven en la base de datos (bcrypt).
          {googleEnabled
            ? " Google OAuth está activo."
            : " Para activar Google, define AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET en .env (Google Cloud Console)."}
        </div>
      </div>
    </div>
  );
}
