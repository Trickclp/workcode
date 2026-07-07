"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/Logo";
import { Sidebar } from "@/components/shell/Sidebar";
import { useAuth } from "@/lib/auth/store";
import { useWork } from "@/lib/state/work";

/**
 * Layout autenticado: guardia de sesión (JWT de NextAuth), Sidebar
 * persistente e hidratación del módulo Work desde la base de datos.
 *
 * En pantallas pequeñas el Sidebar se convierte en un panel deslizante
 * que se abre con el botón hamburguesa de la barra superior y se
 * cierra al navegar, al tocar el fondo o con su botón ✕.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated } = useAuth();
  const { loaded, fetchAll } = useWork();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (!user.role) router.replace("/onboarding");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (user?.role && !loaded) void fetchAll();
  }, [user, loaded, fetchAll]);

  // Cierra el menú móvil cada vez que cambia la ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!hydrated || !user || !user.role) {
    return <div className="app-loading">Verificando sesión...</div>;
  }

  return (
    <div className="shell">
      <header className="mobile-topbar">
        <button
          className="hamburger"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <Logo size={24} />
      </header>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="shell-main">{children}</main>
    </div>
  );
}
