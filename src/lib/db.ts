import { PrismaClient } from "@prisma/client";

/**
 * Reuse one PrismaClient per process.
 *
 * Keeping the singleton in production too matters on serverless: a warm lambda
 * that re-evaluates this module would otherwise open a second connection pool and
 * help exhaust the database's connection limit.
 *
 * DATABASE_URL should point at a pooler with `?pgbouncer=true&connection_limit=1`
 * (see .env.example); DIRECT_URL is used for migrations.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

globalForPrisma.prisma = prisma;
