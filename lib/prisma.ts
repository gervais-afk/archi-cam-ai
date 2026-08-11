/**
 * PRISMA CLIENT SINGLETON — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Instantie le client Prisma de manière sécurisée en mode singleton.
 * Si @prisma/client n'est pas encore généré, fournit un fallback sécurisé.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface PrismaUserWallet {
  id: string;
  email?: string | null;
  creditsBalance: number;
}

export interface PrismaTransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  provider: "STRIPE" | "ORANGE_MONEY" | "MTN_MOMO" | "SYSTEM";
  status: "PENDING" | "SUCCESS" | "FAILED";
  feature?: string | null;
}

let prismaInstance: any = null;

try {
  // Chargement dynamique si le package @prisma/client est généré
  const { PrismaClient } = require("@prisma/client");
  const globalForPrisma = globalThis as unknown as { prisma: any };
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaInstance;
} catch {
  // Fallback dev gracieux
  prismaInstance = {
    user: {
      findUnique: async () => null,
      upsert: async () => ({ id: "demo-user", creditsBalance: 10 }),
    },
    transaction: {
      create: async (data: any) => ({ id: `tx_${Date.now()}`, ...data.data }),
    },
  };
}

export const prisma: any = prismaInstance;
