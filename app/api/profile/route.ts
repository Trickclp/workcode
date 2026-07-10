import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Perfil del usuario autenticado.
 *  GET   → datos básicos (nombre, correo, rol, proveedor).
 *  PATCH → cambia el nombre y/o la contraseña (esta última exige la
 *          contraseña actual y solo aplica a cuentas de correo).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
    hasPassword: Boolean(user.passwordHash),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const body = (await request.json()) as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const data: { name?: string; passwordHash?: string } = {};

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.newPassword) {
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Tu cuenta usa Google; no tiene contraseña que cambiar." },
        { status: 400 }
      );
    }
    if (body.newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(body.currentPassword ?? "", user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true, name: updated.name });
}
