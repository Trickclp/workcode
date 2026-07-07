"use client";

import { TraceStep } from "@/lib/debugger/trace";

interface DebuggerPanelProps {
  steps: TraceStep[];
  index: number;
  onIndexChange: (index: number) => void;
  onExit: () => void;
}

/**
 * Panel lateral del debugger: controles de reproducción de la traza
 * y tabla con el estado de las variables en memoria en el paso actual.
 */
export function DebuggerPanel({ steps, index, onIndexChange, onExit }: DebuggerPanelProps) {
  const step = steps[index];
  const variables = step ? Object.entries(step.vars) : [];

  return (
    <aside className="debugger">
      <div className="debugger-header">
        <span>🐞 DEPURADOR</span>
        <button className="icon-button" onClick={onExit} title="Salir del depurador">
          ✕
        </button>
      </div>

      <div className="debugger-controls">
        <button className="btn ghost" disabled={index === 0} onClick={() => onIndexChange(0)} title="Primer paso">
          ⏮
        </button>
        <button className="btn ghost" disabled={index === 0} onClick={() => onIndexChange(index - 1)} title="Paso anterior">
          ◀
        </button>
        <button
          className="btn ghost"
          disabled={index >= steps.length - 1}
          onClick={() => onIndexChange(index + 1)}
          title="Paso siguiente"
        >
          ▶
        </button>
        <button
          className="btn ghost"
          disabled={index >= steps.length - 1}
          onClick={() => onIndexChange(steps.length - 1)}
          title="Último paso"
        >
          ⏭
        </button>
      </div>

      <div className="debugger-status">
        Paso {index + 1} / {steps.length} — línea {step?.line ?? "?"}
      </div>

      <div className="debugger-vars">
        <div className="debugger-vars-title">VARIABLES EN MEMORIA</div>
        {variables.length === 0 && <div className="debugger-empty">Sin variables todavía.</div>}
        <table>
          <tbody>
            {variables.map(([name, value]) => (
              <tr key={name}>
                <td className="var-name">{name}</td>
                <td className="var-value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
