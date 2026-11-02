import { PrismaClient } from "@prisma/client";

// A single PrismaClient per runtime instance. On Vercel, DATABASE_URL must point at a
// pooled connection (e.g. Neon/Supabase pooler); DIRECT_URL is only used for migrations.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
