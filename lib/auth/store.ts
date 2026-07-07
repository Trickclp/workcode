"use client";

/**
 * Puente de autenticación de Work.Code sobre NextAuth v5.
 *
 * Toda la app consume useAuth() con esta interfaz estable; por debajo
 * la sesión es un JWT real emitido por el servidor y las cuentas viven
 * en la base de datos (tabla User, hash bcrypt). Google OAuth se
 * activa definiendo AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET en .env.
 */

import { signIn, signOut, useSession } from "next-auth/react";

export type Role = "alumno" | "profesor";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  initial: string;
  role: Role | null;
}

export function useAuth() {
  const { data, status, update } = useSession();

  const user: SessionUser | null = data?.user?.email
    ? {
        id: data.user.email,
        name: data.user.name ?? data.user.email,
        email: data.user.email,
        initial: (data.user.name ?? data.user.email)[0]?.toUpperCase() ?? "?",
        role: data.user.role,
      }
    : null;

  return {
    user,
    hydrated: status !== "loading",

    signInWithGoogle: () => {
      void signIn("google", { callbackUrl: "/" });
    },

    /** Devuelve mensaje de error o null si el login fue exitoso. */
    signInWithPassword: async (email: string, password: string): Promise<string | null> => {
      const result = await signIn("credentials", { redirect: false, email, password });
      return result?.error ? "Correo o contraseña incorrectos." : null;
    },

    /** Registro con rol. Devuelve mensaje de error o null. */
    register: async (
      name: string,
      email: string,
      password: string,
      role: Role
    ): Promise<string | null> => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        return data?.error ?? "No se pudo crear la cuenta.";
      }
      const result = await signIn("credentials", { redirect: false, email, password });
      return result?.error ? "Cuenta creada, pero el login falló. Intenta iniciar sesión." : null;
    },

    /** Onboarding de Google y Dev Toggle: persiste el rol y refresca el JWT. */
    setRole: async (role: Role): Promise<void> => {
      await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await update({ role });
    },

    signOut: () => {
      void signOut({ callbackUrl: "/login" });
    },
  };
}
