"use client";

import { useEffect, useState } from "react";

/**
 * Tema claro/oscuro. Se guarda en localStorage y se aplica como
 * atributo data-theme en <html>. Un script en el layout lo aplica antes
 * del primer pintado para evitar el parpadeo.
 */

export type Theme = "dark" | "light";

const KEY = "workcode-theme";
const EVENT = "workcode-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.dataset.theme as Theme) || "dark";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Hook reactivo: devuelve el tema actual y se actualiza al cambiar. */
export function useTheme(): Theme {
  const [theme, set] = useState<Theme>("dark");
  useEffect(() => {
    set(getTheme());
    const onChange = () => set(getTheme());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return theme;
}

/** Script para el <head>: aplica el tema guardado sin parpadeo. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${KEY}')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}`;
