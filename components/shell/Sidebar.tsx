"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role, useAuth } from "@/lib/auth/store";
import { Logo } from "./Logo";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Submenú de Work según el rol — el requisito core del negocio. */
const WORK_ITEMS: Record<Role, NavItem[]> = {
  profesor: [
    { href: "/work/classes", label: "Mis Clases", icon: "🏫" },
    { href: "/work/create", label: "Crear Tarea", icon: "📝" },
    { href: "/work/metrics", label: "Métricas de Alumnos", icon: "📊" },
  ],
  alumno: [
    { href: "/work/tasks", label: "Tareas Pendientes", icon: "📌" },
    { href: "/work/submissions", label: "Entregas", icon: "📤" },
    { href: "/work/grades", label: "Calificaciones", icon: "🏅" },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  if (!user || !user.role) return null;

  const isActive = (href: string) =>
    href === "/work" ? pathname.startsWith("/work") : pathname.startsWith(href);

  const item = (nav: NavItem, sub = false) => (
    <Link
      key={nav.href}
      href={nav.href}
      className={`nav-item${sub ? " sub" : ""}${isActive(nav.href) ? " active" : ""}`}
    >
      <span className="nav-icon">{nav.icon}</span>
      {nav.label}
    </Link>
  );

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <Logo size={28} />
      </div>

      <div className="sidebar-section">PRINCIPAL</div>
      {item({ href: "/playground", label: "Playground", icon: "🧪" })}
      {item({ href: "/projects", label: "Projects", icon: "🗂️" })}
      {item({ href: "/work", label: "Work", icon: "🎓" })}
      <div className="sidebar-subnav">
        {WORK_ITEMS[user.role].map((nav) => item(nav, true))}
      </div>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">{user.initial}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
        <div className={`role-badge role-${user.role}`}>
          {user.role === "profesor" ? "🧑‍🏫 Profesor" : "🎒 Alumno"}
        </div>
        <div className="sidebar-actions">
          <button className="btn ghost small" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
