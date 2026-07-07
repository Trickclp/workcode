import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Autenticación real de Work.Code con NextAuth v5 (Auth.js).
 *
 * - Correo/contraseña: 100% funcional hoy — verifica contra la tabla
 *   User de la base de datos (hash bcrypt).
 * - Google OAuth: se activa automáticamente al definir AUTH_GOOGLE_ID
 *   y AUTH_GOOGLE_SECRET en .env (credenciales de Google Cloud
 *   Console, redirect http://localhost:3000/api/auth/callback/google).
 *   El primer login con Google deja role=null → onboarding de rol.
 *
 * Sesión JWT con el rol incluido; el Dev Toggle y el onboarding
 * actualizan el rol vía POST /api/auth/role + session.update().
 */

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      if (!(await bcrypt.compare(password, user.passwordHash))) return null;

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
];

if (googleEnabled) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Alta automática del usuario de Google en nuestra tabla.
      if (account?.provider === "google" && user.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: user.name ?? user.email,
            provider: "google",
            role: null,
          },
        });
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Primer sign-in: trae el rol desde la base de datos.
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        token.role = dbUser?.role ?? null;
      }
      // session.update({ role }) tras onboarding o Dev Toggle.
      if (trigger === "update" && session?.role !== undefined) {
        token.role = session.role;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.role = (token.role as "alumno" | "profesor" | null) ?? null;
      return session;
    },
  },
});
