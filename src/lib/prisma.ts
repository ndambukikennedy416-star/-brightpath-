import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma v7: driver adapter required.
// Supabase pooler requires SSL; rejectUnauthorized:false matches Supabase cert chain via pgbouncer.
const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
