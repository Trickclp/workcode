import { PrismaClient } from "@prisma/client";

/**
 * Singleton de Prisma: en desarrollo Next recarga los módulos con HMR,
 * así que se guarda la instancia en globalThis para no agotar
 * conexiones. Patrón oficial de Prisma para Next.js.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
