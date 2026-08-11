import { supabase } from './supabase';
import { generateRefundReference, generateCashierReference } from './referenceGenerator';

/**
 * Service de gestion des remboursements
 * Gère les remboursements avec transactions négatives
 */

export interface RefundParams {
  original_invoice_id?: string;
  original_payment_id?: string;
  original_transaction_id?: string;
  patient_id: string;
  amount: number;
  reason: string;
  refund_method?: 'cash' | 'card' | 'transfer';
}

/**
 * Crée un remboursement
 * Crée automatiquement une transaction négative dans la caisse
 * Ne supprime jamais la transaction originale
 */
export async function createRefund(params: RefundParams): Promise<{ refund?: any; transaction?: any; error?: string }> {
  try {
    const refundReference = await generateRefundReference();

    const { data: refund, error: refundError } = await supabase.from('refunds').insert([{
      reference: refundReference,
      original_invoice_id: params.original_invoice_id,
      original_payment_id: params.original_payment_id,
      original_transaction_id: params.original_transaction_id,
      patient_id: params.patient_id,
      amount: params.amount,
      reason: params.reason,
      status: 'pending',
    }]).select().single();

    if (refundError) throw refundError;

    // Créer automatiquement une transaction négative dans la caisse
    const transactionResult = await createRefundTransaction({
      refund_id: refund.id,
      amount: params.amount,
      reason: params.reason,
      patient_id: params.patient_id,
      original_reference: params.original_invoice_id || params.original_payment_id || params.original_transaction_id
    });

    if (transactionResult.error) {
      return { refund, error: transactionResult.error };
    }

    return { refund, transaction: transactionResult.transaction };
  } catch (error) {
    console.error('Error creating refund:', error);
    return { error: (error as any).message };
  }
}

/**
 * Crée une transaction négative pour un remboursement
 */
async function createRefundTransaction(params: {
  refund_id: string;
  amount: number;
  reason: string;
  patient_id: string;
  original_reference?: string;
}): Promise<{ transaction?: any; error?: string }> {
  try {
    const cashierReference = await generateCashierReference();

    const { data: transaction, error } = await supabase.from('transactions').insert([{
      reference: cashierReference,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString().split('T')[1].split('.')[0],
      patient_id: params.patient_id,
      type: 'refund',
      category: 'refund',
      amount: -Math.abs(params.amount), // Négatif pour les remboursements
      source: 'refund',
      source_reference: params.refund_id,
      status: 'validated',
      notes: `Remboursement: ${params.reason}${params.original_reference ? ` - Réf originale: ${params.original_reference}` : ''}`,
    }]).select().single();

    if (error) throw error;

    return { transaction };
  } catch (error) {
    console.error('Error creating refund transaction:', error);
    return { error: (error as any).message };
  }
}

/**
 * Approuve un remboursement
 */
export async function approveRefund(refundId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('refunds').update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', refundId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error approving refund:', error);
    return { error: (error as any).message };
  }
}

/**
 * Rejette un remboursement
 */
export async function rejectRefund(refundId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('refunds').update({
      status: 'rejected',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', refundId);

    if (error) throw error;

    // Annuler la transaction associée
    const { data: refund } = await supabase.from('refunds').select('reference').eq('id', refundId).single();
    if (refund) {
      await supabase.from('transactions').update({ status: 'cancelled' }).eq('source_reference', refund.reference);
    }

    return {};
  } catch (error) {
    console.error('Error rejecting refund:', error);
    return { error: (error as any).message };
  }
}

/**
 * Marque un remboursement comme traité
 */
export async function processRefund(refundId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('refunds').update({
      status: 'processed'
    }).eq('id', refundId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error processing refund:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère tous les remboursements
 */
export async function getRefunds(filters?: {
  status?: string;
  patient_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('refunds').select('*').order('refund_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters?.startDate) {
      query = query.gte('refund_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('refund_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return [];
  }
}

/**
 * Récupère les remboursements en attente d'approbation
 */
export async function getPendingRefunds() {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('status', 'pending')
      .order('refund_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pending refunds:', error);
    return [];
  }
}

/**
 * Récupère le total des remboursements pour une période
 */
export async function getTotalRefunds(startDate?: string, endDate?: string): Promise<number> {
  try {
    let query = supabase.from('refunds').select('amount').in('status', ['approved', 'processed']);
    
    if (startDate) {
      query = query.gte('refund_date', startDate);
    }
    if (endDate) {
      query = query.lte('refund_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.reduce((sum, item) => sum + item.amount, 0) || 0;
  } catch (error) {
    console.error('Error fetching total refunds:', error);
    return 0;
  }
}

/**
 * Récupère les remboursements d'une facture
 */
export async function getInvoiceRefunds(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('original_invoice_id', invoiceId)
      .order('refund_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching invoice refunds:', error);
    return [];
  }
}

/**
 * Récupère les remboursements d'un patient
 */
export async function getPatientRefunds(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('patient_id', patientId)
      .order('refund_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching patient refunds:', error);
    return [];
  }
}

/**
 * Modifie un remboursement
 */
export async function updateRefund(refundId: string, params: Partial<RefundParams>): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('refunds').update({
      ...params,
      updated_at: new Date().toISOString()
    }).eq('id', refundId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error updating refund:', error);
    return { error: (error as any).message };
  }
}

/**
 * Formate le statut d'un remboursement
 */
export function formatRefundStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    processed: 'Traité'
  };
  return labels[status] || status;
}

/**
 * Vérifie si un remboursement est possible pour une facture
 */
export async function canRefundInvoice(invoiceId: string): Promise<{ canRefund: boolean; reason?: string }> {
  try {
    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { canRefund: false, reason: 'Facture non trouvée' };
    }

    // Vérifier que la facture est payée
    if (invoice.status !== 'paid' && invoice.status !== 'partially_paid') {
      return { canRefund: false, reason: 'La facture n\'est pas payée' };
    }

    // Récupérer les remboursements existants
    const existingRefunds = await getInvoiceRefunds(invoiceId);
    const totalRefunded = existingRefunds
      .filter(r => r.status === 'approved' || r.status === 'processed')
      .reduce((sum, r) => sum + r.amount, 0);

    // Vérifier que le montant remboursable est positif
    const refundableAmount = invoice.paid_amount - totalRefunded;
    if (refundableAmount <= 0) {
      return { canRefund: false, reason: 'Le montant remboursable est épuisé' };
    }

    return { canRefund: true };
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return { canRefund: false, reason: 'Erreur lors de la vérification' };
  }
}

/**
 * Calcule le montant remboursable pour une facture
 */
export async function getRefundableAmount(invoiceId: string): Promise<number> {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return 0;

    const existingRefunds = await getInvoiceRefunds(invoiceId);
    const totalRefunded = existingRefunds
      .filter(r => r.status === 'approved' || r.status === 'processed')
      .reduce((sum, r) => sum + r.amount, 0);

    return Math.max(0, invoice.paid_amount - totalRefunded);
  } catch (error) {
    console.error('Error calculating refundable amount:', error);
    return 0;
  }
}
