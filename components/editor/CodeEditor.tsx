"use client";

import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import { MONACO_LANGUAGE, RuntimeId } from "@/lib/runtimes";
import { registerPseudocodeLanguage } from "@/lib/monaco/pseudocode-language";
import { useTheme } from "@/lib/theme";

const OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "Consolas, 'Courier New', monospace",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 12 },
  tabSize: 4,
  glyphMargin: true,
} as const;

interface CodeEditorProps {
  language: RuntimeId;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  onMount?: OnMount;
}

export function CodeEditor({ language, value, onChange, readOnly, onMount }: CodeEditorProps) {
  const theme = useTheme();
  const beforeMount: BeforeMount = (monaco) => registerPseudocodeLanguage(monaco);

  return (
    <Editor
      language={MONACO_LANGUAGE[language]}
      theme={theme === "light" ? "light" : "vs-dark"}
      value={value}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(next) => onChange?.(next ?? "")}
      options={{ ...OPTIONS, readOnly: readOnly ?? false }}
    />
  );
}
