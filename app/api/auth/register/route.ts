import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

/** Registro con correo/contraseña + rol (Alumno o Profesor). */
export async function POST(request: Request) {
  // Anti-spam: máx. 5 cuentas por IP cada 10 minutos.
  const limit = rateLimit(`register:${clientIp(request)}`, 5, 600_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Demasiados registros. Intenta en ${limit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role;

  if (!name) return NextResponse.json({ error: "Ingresa tu nombre." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }
  if (role !== "alumno" && role !== "profesor") {
    return NextResponse.json({ error: "Selecciona tu rol." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese correo." },
      { status: 409 }
    );
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      provider: "password",
    },
  });

  return NextResponse.json({ ok: true });
}
