"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role, useAuth } from "@/lib/auth/store";

/**
 * Primer inicio de sesión: el usuario elige su rol. El menú lateral
 * y todo el módulo Work cambian según esta elección.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, hydrated, setRole } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role) router.replace("/playground");
  }, [hydrated, user, router]);

  const choose = async (role: Role) => {
    await setRole(role);
    router.replace("/playground");
  };

  return (
    <div className="auth-screen">
      <div className="auth-card wide">
        <h1 className="onboarding-title">¡Hola{user ? `, ${user.name}` : ""}! 👋</h1>
        <p className="auth-tagline">¿Cómo usarás Work.Code? Esto define tu menú y tu vista de Work.</p>

        <div className="role-grid">
          <button className="role-card" onClick={() => void choose("alumno")}>
            <div className="role-emoji">🎒</div>
            <h2>Alumno</h2>
            <p>Resuelve tareas con auto-evaluación instantánea, revisa tus entregas y calificaciones.</p>
          </button>

          <button className="role-card" onClick={() => void choose("profesor")}>
            <div className="role-emoji">🧑‍🏫</div>
            <h2>Profesor</h2>
            <p>Crea clases y tareas con casos de prueba, y sigue las métricas de tus alumnos.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
