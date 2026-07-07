"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Workbench from "@/components/Workbench";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { getLanguage, RuntimeId } from "@/lib/runtimes";

/**
 * Editor temporal del Playground. El código de cada lenguaje se
 * conserva en sessionStorage mientras dure la pestaña del navegador.
 */
export default function PlaygroundEditorPage() {
  const params = useParams<{ lang: string }>();
  const langId = params.lang as RuntimeId;
  const info = getLanguage(langId);

  const storageKey = `idestudio-scratch-${langId}`;
  const [code, setCode] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    setCode(saved ?? info?.sample ?? "");
    setReady(true);
  }, [storageKey, info]);

  const handleChange = useCallback(
    (next: string) => {
      setCode(next);
      window.sessionStorage.setItem(storageKey, next);
    },
    [storageKey]
  );

  if (!info || !info.available) {
    return (
      <div className="page">
        <h1>Entorno no disponible</h1>
        <p className="page-subtitle">Este lenguaje todavía no tiene runtime en el navegador.</p>
        <Link className="btn primary" href="/playground">
          ← Volver al Playground
        </Link>
      </div>
    );
  }

  // El traductor Pseudo→Python conserva su interfaz original de dos paneles.
  if (langId === "translator") {
    return (
      <div className="editor-page">
        <div className="editor-page-header">
          <Link href="/playground" className="back-link">
            ← Playground
          </Link>
          <span>Traductor en vivo con transpilador AST</span>
        </div>
        <div className="editor-page-body">
          <Workbench />
        </div>
      </div>
    );
  }

  if (!ready) return <div className="app-loading">Preparando editor...</div>;

  return (
    <div className="editor-page">
      <div className="editor-page-header">
        <Link href="/playground" className="back-link">
          ← Playground
        </Link>
        <span>Editor temporal — se conserva mientras esta pestaña siga abierta</span>
      </div>
      <div className="editor-page-body">
        <EditorWorkspace language={langId} code={code} onCodeChange={handleChange} />
      </div>
    </div>
  );
}
