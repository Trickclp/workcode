"use client";

/**
 * Gestor de archivos personal (sección Projects).
 *
 * Árbol de carpetas/archivos plano (Record indexado por id + parentId)
 * más el estado del editor multi-pestaña. Todo persiste en localStorage;
 * al abrir varias pestañas, el contenido de cada archivo vive en el store,
 * por lo que cambiar de pestaña conserva el estado de cada una.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RuntimeId } from "../runtimes/types";

export type NodeType = "file" | "folder";

export interface FileNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  name: string;
  content?: string;
}

const EXTENSION_LANGUAGE: Record<string, RuntimeId> = {
  psc: "pseudocode",
  py: "python",
  js: "javascript",
  cpp: "cpp",
};

export function languageForFile(name: string): RuntimeId {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_LANGUAGE[ext] ?? "python";
}

function newId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const SEED_NODES: Record<string, FileNode> = {
  "f-ejemplos": { id: "f-ejemplos", parentId: null, type: "folder", name: "Ejemplos" },
  "a-hola": {
    id: "a-hola",
    parentId: "f-ejemplos",
    type: "file",
    name: "hola.psc",
    content: `Proceso Hola
	Escribir "Hola desde Projects"
	Para i <- 1 Hasta 3 Hacer
		Escribir "Iteración ", i
	FinPara
FinProceso`,
  },
  "a-fibo": {
    id: "a-fibo",
    parentId: "f-ejemplos",
    type: "file",
    name: "fibonacci.py",
    content: `a, b = 0, 1
for _ in range(10):
    print(a)
    a, b = b, a + b`,
  },
};

interface ProjectsState {
  nodes: Record<string, FileNode>;
  openTabs: string[];
  activeTab: string | null;

  createNode(parentId: string | null, type: NodeType, name: string): string;
  renameNode(id: string, name: string): void;
  deleteNode(id: string): void;
  openFile(id: string): void;
  closeTab(id: string): void;
  setActiveTab(id: string): void;
  updateContent(id: string, content: string): void;
}

export const useProjects = create<ProjectsState>()(
  persist(
    (set, get) => ({
      nodes: SEED_NODES,
      openTabs: [],
      activeTab: null,

      createNode: (parentId, type, name) => {
        const id = newId();
        const node: FileNode = {
          id,
          parentId,
          type,
          name,
          ...(type === "file" ? { content: "" } : {}),
        };
        set((state) => ({ nodes: { ...state.nodes, [id]: node } }));
        if (type === "file") get().openFile(id);
        return id;
      },

      renameNode: (id, name) =>
        set((state) => ({
          nodes: { ...state.nodes, [id]: { ...state.nodes[id], name } },
        })),

      deleteNode: (id) =>
        set((state) => {
          // Recolecta el nodo y todos sus descendientes.
          const doomed = new Set<string>([id]);
          let grew = true;
          while (grew) {
            grew = false;
            for (const node of Object.values(state.nodes)) {
              if (node.parentId && doomed.has(node.parentId) && !doomed.has(node.id)) {
                doomed.add(node.id);
                grew = true;
              }
            }
          }
          const nodes = Object.fromEntries(
            Object.entries(state.nodes).filter(([nodeId]) => !doomed.has(nodeId))
          );
          const openTabs = state.openTabs.filter((tabId) => !doomed.has(tabId));
          const activeTab = doomed.has(state.activeTab ?? "")
            ? openTabs[openTabs.length - 1] ?? null
            : state.activeTab;
          return { nodes, openTabs, activeTab };
        }),

      openFile: (id) =>
        set((state) => ({
          openTabs: state.openTabs.includes(id)
            ? state.openTabs
            : [...state.openTabs, id],
          activeTab: id,
        })),

      closeTab: (id) =>
        set((state) => {
          const openTabs = state.openTabs.filter((tabId) => tabId !== id);
          const activeTab =
            state.activeTab === id
              ? openTabs[openTabs.length - 1] ?? null
              : state.activeTab;
          return { openTabs, activeTab };
        }),

      setActiveTab: (id) => set({ activeTab: id }),

      updateContent: (id, content) =>
        set((state) => ({
          nodes: { ...state.nodes, [id]: { ...state.nodes[id], content } },
        })),
    }),
    { name: "workcode-projects" }
  )
);
