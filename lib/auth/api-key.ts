import { prisma } from "@/lib/prisma";

export async function authenticateAPIKey(apiKey: string | null) {
  if (!apiKey) return null;

  try {
    // 1. Récupérer la clé API dans PostgreSQL
    const keyRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "user_id" FROM "api_keys" WHERE "key" = $1 LIMIT 1`,
      apiKey
    );

    if (!keyRows || keyRows.length === 0) {
      return null;
    }

    const userId = keyRows[0].user_id;

    // 2. Récupérer l'utilisateur correspondant
    const userRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, role, "credits_balance" as "creditsBalance" 
       FROM "users" 
       WHERE id = $1 LIMIT 1`,
      userId
    );

    if (!userRows || userRows.length === 0) {
      return null;
    }

    return userRows[0];
  } catch (err: any) {
    console.error("[authenticateAPIKey] Error:", err.message);
    return null;
  }
}
