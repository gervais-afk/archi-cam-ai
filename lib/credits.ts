import { query } from "./db";

export interface UserCreditBalance {
  userId: string;
  balance: number;
}

export interface CreditOperationResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * RÉCUPÈRE LE SOLDE DE CRÉDITS D'UN UTILISATEUR
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const res = await query(
      `SELECT balance FROM user_credits WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (res.rows.length > 0) {
      return parseInt(res.rows[0].balance, 10);
    }
    // Création du compte de crédits par défaut (50 crédits d'accueil)
    await query(
      `INSERT INTO user_credits (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, 50]
    );
    return 50;
  } catch (err) {
    console.warn("[Credits] Erreur lecture solde, fallback 50:", err);
    return 50;
  }
}

/**
 * PRÉLEVEMENT TRANSACTIONNEL DE CRÉDITS AVEC JOURNALISATION
 */
export async function deductCredits(
  userId: string,
  amount: number,
  featureName: string
): Promise<CreditOperationResult> {
  try {
    const currentBalance = await getUserCredits(userId);
    if (currentBalance < amount) {
      return {
        success: false,
        balance: currentBalance,
        error: `Solde insuffisant. Requis: ${amount}, disponible: ${currentBalance}`
      };
    }

    // Mise à jour transactionnelle du solde
    const updateRes = await query(
      `UPDATE user_credits 
       SET balance = balance - $1, updated_at = NOW() 
       WHERE user_id = $2 AND balance >= $1
       RETURNING balance`,
      [amount, userId]
    );

    if (updateRes.rows.length === 0) {
      return {
        success: false,
        balance: currentBalance,
        error: "Échec transactionnel du prélèvement de crédits."
      };
    }

    const newBalance = parseInt(updateRes.rows[0].balance, 10);

    // Enregistrement de la transaction dans le journal d'audit
    await query(
      `INSERT INTO credit_transactions (user_id, amount, feature)
       VALUES ($1, $2, $3)`,
      [userId, -amount, featureName]
    );

    console.log(`[Credits] ${amount} crédits prélevés pour '${featureName}'. Nouveau solde: ${newBalance}`);
    return { success: true, balance: newBalance };
  } catch (err: any) {
    console.error("[Credits] Erreur prélèvement crédits:", err);
    return { success: false, balance: 0, error: err.message || "Erreur serveur" };
  }
}

/**
 * REMBOURSEMENT AUTOMATIQUE DE SECOURS EN CAS D'ÉCHEC DE GÉNÉRATION
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<CreditOperationResult> {
  try {
    const updateRes = await query(
      `UPDATE user_credits 
       SET balance = balance + $1, updated_at = NOW() 
       WHERE user_id = $2
       RETURNING balance`,
      [amount, userId]
    );

    const newBalance = updateRes.rows[0] ? parseInt(updateRes.rows[0].balance, 10) : amount;

    await query(
      `INSERT INTO credit_transactions (user_id, amount, feature)
       VALUES ($1, $2, $3)`,
      [userId, amount, `REFUND: ${reason}`]
    );

    console.log(`[Credits] Remboursement de ${amount} crédits pour '${reason}'. Nouveau solde: ${newBalance}`);
    return { success: true, balance: newBalance };
  } catch (err: any) {
    console.error("[Credits] Erreur remboursement crédits:", err);
    return { success: false, balance: 0, error: err.message };
  }
}
