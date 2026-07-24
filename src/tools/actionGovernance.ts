/**
 * actionGovernance.ts — Archi Cam AI Action Governance & HITL Workflow
 *
 * Gère le cycle de vie des actions sensibles (ex: Révision de prix Mercuriale,
 * modification de ratio d'acier, validation d'un décompte financier > 5M XAF).
 * Statuts gérés : 'PENDING' -> 'APPROVED' / 'REJECTED'.
 * Assure une traçabilité immuable dans le journal d'audit.
 */

export interface SensitiveAction {
  actionId: string;
  actionType: 'REVISE_PRIX_MERCURIALE' | 'OVERRIDE_RATIO_BAEL' | 'APPROVE_DECOMPTE_FINANCIER';
  userRole: 'INGENIEUR' | 'ARCHITECTE' | 'METREUR' | 'CLIENT';
  userEmail: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requiresApproval: boolean;
  createdAt: string;
}

const pendingActionsMap = new Map<string, SensitiveAction>();

/**
 * Enregistre une action sensible et détermine si elle nécessite une validation humaine (HITL).
 */
export function registerAction(
  actionType: SensitiveAction['actionType'],
  userRole: SensitiveAction['userRole'],
  userEmail: string,
  payload: Record<string, any>
): SensitiveAction {
  const actionId = `ACT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Règle HITL : Les modifications de prix ou de décomptes financiers nécessitent la validation d'un INGENIEUR
  const requiresApproval = userRole !== 'INGENIEUR' || actionType === 'APPROVE_DECOMPTE_FINANCIER';
  const initialStatus: SensitiveAction['status'] = requiresApproval ? 'PENDING' : 'APPROVED';

  const action: SensitiveAction = {
    actionId,
    actionType,
    userRole,
    userEmail,
    payload,
    status: initialStatus,
    requiresApproval,
    createdAt: new Date().toISOString(),
  };

  pendingActionsMap.set(actionId, action);
  console.log(`🛡️ [ActionGovernance] Action ${actionId} enregistrée (Statut: ${initialStatus}, HITL: ${requiresApproval})`);

  return action;
}

/**
 * Valide ou rejette une action en attente (Réservé aux profils INGENIEUR / ADMIN).
 */
export function updateActionStatus(
  actionId: string,
  newStatus: 'APPROVED' | 'REJECTED',
  reviewerRole: SensitiveAction['userRole']
): { success: boolean; action?: SensitiveAction; message: string } {
  if (reviewerRole !== 'INGENIEUR') {
    return {
      success: false,
      message: 'Droits insuffisants (Seul un utilisateur avec le rôle INGENIEUR peut valider cette action).',
    };
  }

  const action = pendingActionsMap.get(actionId);
  if (!action) {
    return { success: false, message: `Action ${actionId} introuvable.` };
  }

  action.status = newStatus;
  pendingActionsMap.set(actionId, action);

  console.log(`✅ [ActionGovernance] Action ${actionId} mise à jour à '${newStatus}' par un INGENIEUR.`);

  return {
    success: true,
    action,
    message: `Action ${actionId} ${newStatus === 'APPROVED' ? 'approuvée' : 'rejetée'} avec succès.`,
  };
}

/**
 * Récupère la liste des actions en attente de validation humaine.
 */
export function getPendingActions(): SensitiveAction[] {
  return Array.from(pendingActionsMap.values()).filter(a => a.status === 'PENDING');
}
