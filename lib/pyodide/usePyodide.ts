"use client";

/**
 * Hook fino sobre el singleton de Pyodide (lib/pyodide/loader.ts).
 * Lo usa el Workbench del traductor; el resto de la plataforma
 * ejecuta a través de lib/runtimes/runCode().
 */

import { useCallback, useEffect, useState } from "react";
import { getPyodide } from "./loader";
import { runPython } from "../runtimes/python";

export type PyodideStatus = "loading" | "ready" | "running" | "error";

export interface RunCallbacks {
  onStdout: (text: string) => void;
  onStderr: (text: string) => void;
}

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    getPyodide()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async (code: string, callbacks: RunCallbacks) => {
    setStatus("running");
    try {
      await runPython(code, callbacks);
    } finally {
      setStatus("ready");
    }
  }, []);

  return { status, runPython: run };
}
