"use client";

import { useMemo, useState } from "react";
import { FileNode, useProjects } from "@/lib/state/projects";

const FILE_ICONS: Record<string, string> = {
  psc: "📜",
  py: "🐍",
  js: "🟨",
  cpp: "⚙️",
};

function iconFor(node: FileNode): string {
  if (node.type === "folder") return "📁";
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "📄";
}

/**
 * Árbol de archivos personal: crear carpetas/archivos, renombrar,
 * eliminar y abrir archivos en pestañas del editor.
 */
export function FileExplorer() {
  const { nodes, activeTab, createNode, renameNode, deleteNode, openFile } = useProjects();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FileNode[]>();
    for (const node of Object.values(nodes)) {
      const list = map.get(node.parentId) ?? [];
      list.push(node);
      map.set(node.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)
      );
    }
    return map;
  }, [nodes]);

  const handleNewFile = () => {
    const name = window.prompt("Nombre del archivo (usa .psc, .py o .js):", "nuevo.py");
    if (name) createNode(selectedFolder, "file", name.trim());
  };

  const handleNewFolder = () => {
    const name = window.prompt("Nombre de la carpeta:", "Mi carpeta");
    if (name) createNode(selectedFolder, "folder", name.trim());
  };

  const handleRename = (node: FileNode) => {
    const name = window.prompt("Nuevo nombre:", node.name);
    if (name) renameNode(node.id, name.trim());
  };

  const handleDelete = (node: FileNode) => {
    if (window.confirm(`¿Eliminar "${node.name}"${node.type === "folder" ? " y todo su contenido" : ""}?`)) {
      deleteNode(node.id);
      if (selectedFolder === node.id) setSelectedFolder(null);
    }
  };

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLevel = (parentId: string | null, depth: number) => {
    const children = childrenOf.get(parentId) ?? [];
    return children.map((node) => (
      <div key={node.id}>
        <div
          className={`tree-row${node.id === activeTab ? " active" : ""}${
            node.id === selectedFolder ? " selected" : ""
          }`}
          style={{ paddingLeft: 10 + depth * 16 }}
          onClick={() => {
            if (node.type === "folder") {
              setSelectedFolder(node.id === selectedFolder ? null : node.id);
              toggleCollapse(node.id);
            } else {
              openFile(node.id);
            }
          }}
        >
          <span className="tree-icon">{iconFor(node)}</span>
          <span className="tree-name">{node.name}</span>
          <span className="tree-actions">
            <button
              className="icon-button"
              title="Renombrar"
              onClick={(e) => {
                e.stopPropagation();
                handleRename(node);
              }}
            >
              ✎
            </button>
            <button
              className="icon-button"
              title="Eliminar"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
            >
              ✕
            </button>
          </span>
        </div>
        {node.type === "folder" && !collapsed.has(node.id) && renderLevel(node.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="explorer">
      <div className="explorer-header">
        <span>EXPLORADOR</span>
        <div>
          <button className="icon-button" title="Nuevo archivo" onClick={handleNewFile}>
            📄+
          </button>
          <button className="icon-button" title="Nueva carpeta" onClick={handleNewFolder}>
            📁+
          </button>
        </div>
      </div>
      <div className="explorer-hint">
        {selectedFolder
          ? `Creando dentro de: ${nodes[selectedFolder]?.name ?? ""}`
          : "Los nuevos elementos van a la raíz"}
      </div>
      <div className="explorer-tree">{renderLevel(null, 0)}</div>
    </div>
  );
}
