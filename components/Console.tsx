"use client";

import { useEffect, useRef } from "react";

export interface ConsoleLine {
  type: "stdout" | "stderr" | "system";
  text: string;
}

export function Console({ lines }: { lines: ConsoleLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="console">
      <div className="console-header">
        <span className="console-dot red" />
        <span className="console-dot yellow" />
        <span className="console-dot green" />
        <span className="console-title">TERMINAL — Pyodide (Python 3.12 / WebAssembly)</span>
      </div>
      <div className="console-body">
        {lines.length === 0 && (
          <div className="console-line system">
            La salida de tu programa aparecerá aquí. Presiona ▶ Ejecutar o Ctrl+Enter.
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`console-line ${line.type}`}>
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
