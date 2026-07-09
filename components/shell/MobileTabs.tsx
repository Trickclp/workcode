"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra de pestañas inferior — navegación principal en celular,
 * estilo app nativa. El botón Menú abre el panel lateral completo
 * (submenús de Work, perfil y cerrar sesión).
 */
const TABS = [
  { href: "/playground", icon: "🧪", label: "Playground" },
  { href: "/projects", icon: "🗂️", label: "Projects" },
  { href: "/work", icon: "🎓", label: "Work" },
];

export function MobileTabs({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="mobile-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname.startsWith(tab.href) ? "active" : ""}
        >
          <span className="tab-icon">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
      <button onClick={onMenu} aria-label="Abrir menú completo">
        <span className="tab-icon">☰</span>
        Menú
      </button>
    </nav>
  );
}
