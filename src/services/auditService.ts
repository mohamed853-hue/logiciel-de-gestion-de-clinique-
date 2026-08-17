import { supabase } from './supabase';

/**
 * Service de journal d'audit
 * Enregistre toutes les actions importantes pour traçabilité
 */

export interface AuditLogParams {
  action: string;
  entity_type: string;
  entity_id?: string;
  patient_id?: string;
  invoice_id?: string;
  amount?: number;
  field_name?: string;
  old_value?: string;
  new_value?: string;
}

/**
 * Enregistre une action dans le journal d'audit
 */
export async function logAudit(params: AuditLogParams): Promise<{ error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('audit_log').insert([{
      user_id: user.user?.id,
      user_name: user.user?.user_metadata?.full_name || user.user?.email,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      patient_id: params.patient_id,
      invoice_id: params.invoice_id,
      amount: params.amount,
      field_name: params.field_name,
      old_value: params.old_value,
      new_value: params.new_value,
    }]);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error logging audit:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère le journal d'audit
 */
export async function getAuditLogs(filters?: {
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  patient_id?: string;
  invoice_id?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Récupère l'historique d'une entité
 */
export async function getEntityHistory(entityType: string, entityId: string) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching entity history:', error);
    return [];
  }
}

/**
 * Récupère l'historique d'un patient
 */
export async function getPatientHistory(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching patient history:', error);
    return [];
  }
}

/**
 * Récupère l'historique d'une facture
 */
export async function getInvoiceHistory(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching invoice history:', error);
    return [];
  }
}

/**
 * Récupère les actions d'un utilisateur
 */
export async function getUserActions(userId: string, startDate?: string, endDate?: string) {
  try {
    let query = supabase.from('audit_log').select('*').eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user actions:', error);
    return [];
  }
}

/**
 * Formate le type d'action pour l'affichage
 */
export function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    delete: 'Suppression',
    payment: 'Paiement',
    refund: 'Remboursement',
    cancel: 'Annulation',
    approve: 'Approbation',
    reject: 'Rejet',
    deliver: 'Délivrance',
    adjust: 'Ajustement',
    close: 'Clôture',
    print: 'Impression',
    export: 'Export',
  };
  return labels[action] || action;
}

/**
 * Formate le type d'entité pour l'affichage
 */
export function formatEntityType(entityType: string): string {
  const labels: Record<string, string> = {
    patient: 'Patient',
    invoice: 'Facture',
    payment: 'Paiement',
    transaction: 'Transaction',
    prescription: 'Ordonnance',
    prescription_item: 'Ligne ordonnance',
    pharmacy_stock: 'Stock pharmacie',
    pharmacy_sale: 'Vente pharmacie',
    pharmacy_stock_entry: 'Entrée stock',
    expense: 'Dépense',
    refund: 'Remboursement',
    cash_register_closure: 'Clôture caisse',
    appointment: 'Rendez-vous',
    pregnancy: 'Grossesse',
  };
  return labels[entityType] || entityType;
}

/**
 * Fonctions utilitaires pour enregistrer des actions courantes
 */
export const auditActions = {
  // Patient
  patientCreated: (patientId: string, patientName: string) => 
    logAudit({ action: 'create', entity_type: 'patient', entity_id: patientId, new_value: patientName }),
  
  patientUpdated: (patientId: string, fieldName: string, oldValue: string, newValue: string) =>
    logAudit({ action: 'update', entity_type: 'patient', entity_id: patientId, field_name: fieldName, old_value: oldValue, new_value: newValue }),
  
  patientDeleted: (patientId: string, patientName: string) =>
    logAudit({ action: 'delete', entity_type: 'patient', entity_id: patientId, old_value: patientName }),

  // Facture
  invoiceCreated: (invoiceId: string, reference: string, patientId?: string, amount?: number) =>
    logAudit({ action: 'create', entity_type: 'invoice', entity_id: invoiceId, patient_id: patientId, amount, new_value: reference }),
  
  invoicePaid: (invoiceId: string, reference: string, amount: number, patientId?: string) =>
    logAudit({ action: 'payment', entity_type: 'invoice', entity_id: invoiceId, patient_id: patientId, invoice_id: invoiceId, amount, new_value: `${reference} - ${amount} FCFA` }),
  
  invoiceCancelled: (invoiceId: string, reference: string, reason: string) =>
    logAudit({ action: 'cancel', entity_type: 'invoice', entity_id: invoiceId, new_value: `${reference} - ${reason}` }),

  // Transaction
  transactionCreated: (transactionId: string, reference: string, amount: number, type: string) =>
    logAudit({ action: 'create', entity_type: 'transaction', entity_id: transactionId, amount, new_value: `${reference} - ${type} - ${amount} FCFA` }),

  // Ordonnance
  prescriptionCreated: (prescriptionId: string, reference: string, patientId: string) =>
    logAudit({ action: 'create', entity_type: 'prescription', entity_id: prescriptionId, patient_id: patientId, new_value: reference }),
  
  prescriptionDelivered: (prescriptionId: string, reference: string, patientId: string) =>
    logAudit({ action: 'deliver', entity_type: 'prescription', entity_id: prescriptionId, patient_id: patientId, new_value: reference }),

  // Stock
  stockEntryCreated: (entryId: string, reference: string, medicineName: string, quantity: number) =>
    logAudit({ action: 'create', entity_type: 'pharmacy_stock_entry', entity_id: entryId, new_value: `${reference} - ${medicineName} - +${quantity}` }),
  
  stockAdjusted: (stockId: string, medicineName: string, quantity: number, reason: string) =>
    logAudit({ action: 'adjust', entity_type: 'pharmacy_stock', entity_id: stockId, new_value: `${medicineName} - ${quantity} - ${reason}` }),

  // Dépense
  expenseCreated: (expenseId: string, reference: string, amount: number, category: string) =>
    logAudit({ action: 'create', entity_type: 'expense', entity_id: expenseId, amount, new_value: `${reference} - ${category} - ${amount} FCFA` }),
  
  expenseApproved: (expenseId: string, reference: string, amount: number) =>
    logAudit({ action: 'approve', entity_type: 'expense', entity_id: expenseId, amount, new_value: `${reference} - ${amount} FCFA` }),

  // Remboursement
  refundCreated: (refundId: string, reference: string, amount: number, patientId: string) =>
    logAudit({ action: 'refund', entity_type: 'refund', entity_id: refundId, patient_id: patientId, amount, new_value: `${reference} - ${amount} FCFA` }),

  // Clôture caisse
  cashClosureCreated: (closureId: string, reference: string, variance: number) =>
    logAudit({ action: 'close', entity_type: 'cash_register_closure', entity_id: closureId, new_value: `${reference} - Écart: ${variance} FCFA` }),
};
