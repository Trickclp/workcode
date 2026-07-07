"use client";

import { FileExplorer } from "@/components/projects/FileExplorer";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { languageForFile, useProjects } from "@/lib/state/projects";

/**
 * Projects: gestor de archivos personal + editor multi-pestaña.
 * El contenido de cada archivo vive en el store persistido, por lo que
 * cambiar de pestaña conserva el estado de cada una (autosave).
 */
export default function ProjectsPage() {
  const { nodes, openTabs, activeTab, setActiveTab, closeTab, updateContent } = useProjects();
  const activeFile = activeTab ? nodes[activeTab] : null;

  return (
    <div className="projects">
      <FileExplorer />

      <div className="projects-editor">
        <div className="tabs-bar">
          {openTabs.map((tabId) => {
            const file = nodes[tabId];
            if (!file) return null;
            return (
              <div
                key={tabId}
                className={`tab${tabId === activeTab ? " active" : ""}`}
                onClick={() => setActiveTab(tabId)}
              >
                <span>{file.name}</span>
                <button
                  className="tab-close"
                  title="Cerrar pestaña"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tabId);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          {openTabs.length > 0 && <span className="tabs-hint">Guardado automático ✓</span>}
        </div>

        {activeFile ? (
          <EditorWorkspace
            key={activeFile.id}
            language={languageForFile(activeFile.name)}
            code={activeFile.content ?? ""}
            onCodeChange={(content) => updateContent(activeFile.id, content)}
          />
        ) : (
          <div className="projects-empty">
            <h2>🗂️ Tus proyectos</h2>
            <p>
              Abre un archivo del explorador o crea uno nuevo (📄+). Puedes tener varias pestañas
              abiertas a la vez; cada una conserva su contenido automáticamente.
            </p>
            <p className="hint">Extensiones soportadas: .psc (pseudocódigo), .py, .js</p>
          </div>
        )}
      </div>
    </div>
  );
}
