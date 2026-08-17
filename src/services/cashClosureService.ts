import { supabase } from './supabase';
import { generateCashierReference } from './referenceGenerator';

/**
 * Service de clôture de caisse
 * Gère la clôture de caisse avec calcul des écarts et justification
 */

export interface CashClosureParams {
  expected_cash: number;
  expected_card: number;
  expected_other: number;
  actual_cash: number;
  actual_card: number;
  actual_other: number;
  justification?: string;
}

export interface CashClosureResult {
  closure?: any;
  variance_cash: number;
  variance_card: number;
  variance_other: number;
  variance_total: number;
  error?: string;
}

/**
 * Calcule les totaux attendus pour une date donnée
 */
export async function calculateExpectedTotals(date: string): Promise<{
  cash: number;
  card: number;
  other: number;
  total: number;
}> {
  try {
    // Récupérer toutes les transactions de la journée
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', date)
      .in('status', ['validated', 'pending']);

    if (error) throw error;

    // Calculer par méthode de paiement
    const cash = transactions
      ?.filter(t => t.payment_method === 'cash' && t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const card = transactions
      ?.filter(t => t.payment_method === 'card' && t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const other = transactions
      ?.filter(t => t.payment_method === 'transfer' && t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const total = cash + card + other;

    return { cash, card, other, total };
  } catch (error) {
    console.error('Error calculating expected totals:', error);
    return { cash: 0, card: 0, other: 0, total: 0 };
  }
}

/**
 * Crée une clôture de caisse
 */
export async function createCashClosure(params: CashClosureParams): Promise<CashClosureResult> {
  try {
    const closureReference = await generateCashierReference();

    const variance_cash = params.actual_cash - params.expected_cash;
    const variance_card = params.actual_card - params.expected_card;
    const variance_other = params.actual_other - params.expected_other;
    const variance_total = variance_cash + variance_card + variance_other;

    const { data: closure, error: closureError } = await supabase.from('cash_register_closures').insert([{
      reference: closureReference,
      closure_date: new Date().toISOString().split('T')[0],
      expected_cash: params.expected_cash,
      expected_card: params.expected_card,
      expected_other: params.expected_other,
      actual_cash: params.actual_cash,
      actual_card: params.actual_card,
      actual_other: params.actual_other,
      justification: params.justification,
      status: 'pending',
    }]).select().single();

    if (closureError) throw closureError;

    return {
      closure,
      variance_cash,
      variance_card,
      variance_other,
      variance_total
    };
  } catch (error) {
    console.error('Error creating cash closure:', error);
    return {
      variance_cash: 0,
      variance_card: 0,
      variance_other: 0,
      variance_total: 0,
      error: (error as any).message
    };
  }
}

/**
 * Approuve une clôture de caisse
 */
export async function approveCashClosure(closureId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('cash_register_closures').update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', closureId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error approving cash closure:', error);
    return { error: (error as any).message };
  }
}

/**
 * Rejette une clôture de caisse
 */
export async function rejectCashClosure(closureId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('cash_register_closures').update({
      status: 'rejected',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', closureId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error rejecting cash closure:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère les clôtures de caisse
 */
export async function getCashClosures(filters?: {
  date?: string;
  status?: string;
  user_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('cash_register_closures').select('*').order('closure_date', { ascending: false });

    if (filters?.date) {
      query = query.eq('closure_date', filters.date);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.startDate) {
      query = query.gte('closure_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('closure_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching cash closures:', error);
    return [];
  }
}

/**
 * Récupère la clôture de caisse du jour
 */
export async function getTodayClosure(userId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase.from('cash_register_closures').select('*').eq('closure_date', today);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching today closure:', error);
    return null;
  }
}

/**
 * Vérifie si la caisse est déjà clôturée pour aujourd'hui
 */
export async function isCashClosedToday(userId?: string): Promise<boolean> {
  const closure = await getTodayClosure(userId);
  return closure !== null && closure.status === 'approved';
}

/**
 * Récupère les clôtures en attente d'approbation
 */
export async function getPendingClosures() {
  try {
    const { data, error } = await supabase
      .from('cash_register_closures')
      .select('*')
      .eq('status', 'pending')
      .order('closure_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pending closures:', error);
    return [];
  }
}

/**
 * Génère un rapport de clôture de caisse
 */
export async function generateClosureReport(closureId: string) {
  try {
    const { data: closure, error } = await supabase
      .from('cash_register_closures')
      .select('*')
      .eq('id', closureId)
      .single();

    if (error) throw error;

    // Récupérer les transactions de la journée
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', closure.closure_date)
      .in('status', ['validated', 'pending']);

    return {
      closure,
      transactions: transactions || [],
      variance_cash: closure.actual_cash - closure.expected_cash,
      variance_card: closure.actual_card - closure.expected_card,
      variance_other: closure.actual_other - closure.expected_other,
      variance_total: (closure.actual_cash + closure.actual_card + closure.actual_other) - 
                     (closure.expected_cash + closure.expected_card + closure.expected_other)
    };
  } catch (error) {
    console.error('Error generating closure report:', error);
    return null;
  }
}

/**
 * Calcule les statistiques de clôture pour une période
 */
export async function getClosureStatistics(startDate: string, endDate: string) {
  try {
    const { data: closures, error } = await supabase
      .from('cash_register_closures')
      .select('*')
      .gte('closure_date', startDate)
      .lte('closure_date', endDate)
      .eq('status', 'approved');

    if (error) throw error;

    const totalClosures = closures?.length || 0;
    const totalVariance = closures?.reduce((sum, c) => sum + c.variance_total, 0) || 0;
    const positiveVariances = closures?.filter(c => c.variance_total > 0).length || 0;
    const negativeVariances = closures?.filter(c => c.variance_total < 0).length || 0;

    return {
      totalClosures,
      totalVariance,
      positiveVariances,
      negativeVariances,
      averageVariance: totalClosures > 0 ? totalVariance / totalClosures : 0
    };
  } catch (error) {
    console.error('Error calculating closure statistics:', error);
    return {
      totalClosures: 0,
      totalVariance: 0,
      positiveVariances: 0,
      negativeVariances: 0,
      averageVariance: 0
    };
  }
}

/**
 * Formate le statut d'une clôture
 */
export function formatClosureStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté'
  };
  return labels[status] || status;
}

/**
 * Formate un écart pour l'affichage
 */
export function formatVariance(variance: number): string {
  if (variance > 0) {
    return `+${variance.toFixed(2)} FCFA (excédent)`;
  } else if (variance < 0) {
    return `${variance.toFixed(2)} FCFA (manquant)`;
  }
  return '0.00 FCFA (équilibré)';
}

/**
 * Détermine si un écart nécessite une justification
 */
export function requiresJustification(variance: number, threshold: number = 100): boolean {
  return Math.abs(variance) > threshold;
}
