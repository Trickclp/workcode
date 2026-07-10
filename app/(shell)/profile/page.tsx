"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/lib/auth/store";

/**
 * Perfil del usuario: cambiar nombre y (para cuentas de correo)
 * contraseña. El nombre actualizado se refleja en la sesión.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const { update } = useSession();

  const [name, setName] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name ?? "");
        setHasPassword(Boolean(d.hasPassword));
      })
      .catch(() => {});
  }, []);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      await update({});
      setMsg({ kind: "ok", text: "Nombre actualizado." });
    } else {
      setMsg({ kind: "err", text: d.error ?? "No se pudo guardar." });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setMsg({ kind: "ok", text: "Contraseña actualizada." });
    } else {
      setMsg({ kind: "err", text: d.error ?? "No se pudo cambiar la contraseña." });
    }
  };

  return (
    <div className="page">
      <h1>Mi Perfil</h1>
      <p className="page-subtitle">Actualiza tu nombre y tu contraseña.</p>

      {msg && (
        <div className={msg.kind === "ok" ? "profile-ok" : "auth-error"} style={{ maxWidth: 460 }}>
          {msg.text}
        </div>
      )}

      <div className="profile-grid">
        <form className="form profile-card" onSubmit={saveName}>
          <h3>Datos de la cuenta</h3>
          <label>
            Correo
            <input className="input" value={user?.email ?? ""} disabled />
          </label>
          <label>
            Rol
            <input
              className="input"
              value={user?.role === "profesor" ? "Profesor" : "Alumno"}
              disabled
            />
          </label>
          <label>
            Nombre
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            Guardar nombre
          </button>
        </form>

        <form className="form profile-card" onSubmit={savePassword}>
          <h3>Contraseña</h3>
          {hasPassword ? (
            <>
              <label>
                Contraseña actual
                <input
                  className="input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <button className="btn primary" type="submit" disabled={busy}>
                Cambiar contraseña
              </button>
            </>
          ) : (
            <p className="hint">
              Tu cuenta inicia sesión con Google, así que no tiene contraseña que cambiar.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
