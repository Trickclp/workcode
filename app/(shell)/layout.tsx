"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { useAuth } from "@/lib/auth/store";
import { useWork } from "@/lib/state/work";

/**
 * Layout autenticado: guardia de sesión (JWT de NextAuth), Sidebar
 * persistente e hidratación del módulo Work desde la base de datos.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { loaded, fetchAll } = useWork();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (!user.role) router.replace("/onboarding");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (user?.role && !loaded) void fetchAll();
  }, [user, loaded, fetchAll]);

  if (!hydrated || !user || !user.role) {
    return <div className="app-loading">Verificando sesión...</div>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <main className="shell-main">{children}</main>
    </div>
  );
}
