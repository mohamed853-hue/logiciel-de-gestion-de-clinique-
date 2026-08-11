import { supabase } from './supabase';
import { generateExpenseReference, generateCashierReference } from './referenceGenerator';

/**
 * Service de gestion des dépenses
 * Gère les dépenses, fournisseurs et justificatifs
 */

export interface ExpenseParams {
  category: 'supplier' | 'medical_equipment' | 'maintenance' | 'supplies' | 'salary' | 'other';
  supplier?: string;
  amount: number;
  description: string;
  justification?: string; // Chemin vers le justificatif
  expense_date?: string;
}

/**
 * Crée une nouvelle dépense
 * Crée automatiquement une transaction de sortie dans la caisse
 */
export async function createExpense(params: ExpenseParams): Promise<{ expense?: any; transaction?: any; error?: string }> {
  try {
    const expenseReference = await generateExpenseReference();

    const { data: expense, error: expenseError } = await supabase.from('expenses').insert([{
      reference: expenseReference,
      category: params.category,
      supplier: params.supplier,
      amount: params.amount,
      description: params.description,
      justification: params.justification,
      expense_date: params.expense_date || new Date().toISOString().split('T')[0],
      status: 'pending',
    }]).select().single();

    if (expenseError) throw expenseError;

    // Créer automatiquement une transaction de sortie dans la caisse
    const transactionResult = await createExpenseTransaction({
      expense_id: expense.id,
      amount: params.amount,
      category: params.category,
      description: params.description,
      supplier: params.supplier
    });

    if (transactionResult.error) {
      return { expense, error: transactionResult.error };
    }

    return { expense, transaction: transactionResult.transaction };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { error: (error as any).message };
  }
}

/**
 * Crée une transaction de dépense dans la caisse
 */
async function createExpenseTransaction(params: {
  expense_id: string;
  amount: number;
  category: string;
  description: string;
  supplier?: string;
}): Promise<{ transaction?: any; error?: string }> {
  try {
    const cashierReference = await generateCashierReference();

    const { data: transaction, error } = await supabase.from('transactions').insert([{
      reference: cashierReference,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString().split('T')[1].split('.')[0],
      type: 'expense',
      category: params.category,
      amount: -Math.abs(params.amount), // Négatif pour les dépenses
      source: 'expense',
      source_reference: params.expense_id,
      status: 'validated',
      notes: `${params.description}${params.supplier ? ` - Fournisseur: ${params.supplier}` : ''}`,
    }]).select().single();

    if (error) throw error;

    return { transaction };
  } catch (error) {
    console.error('Error creating expense transaction:', error);
    return { error: (error as any).message };
  }
}

/**
 * Approuve une dépense
 */
export async function approveExpense(expenseId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('expenses').update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', expenseId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error approving expense:', error);
    return { error: (error as any).message };
  }
}

/**
 * Rejette une dépense
 */
export async function rejectExpense(expenseId: string, approverId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('expenses').update({
      status: 'rejected',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    }).eq('id', expenseId);

    if (error) throw error;

    // Annuler la transaction associée
    const { data: expense } = await supabase.from('expenses').select('reference').eq('id', expenseId).single();
    if (expense) {
      await supabase.from('transactions').update({ status: 'cancelled' }).eq('source_reference', expense.reference);
    }

    return {};
  } catch (error) {
    console.error('Error rejecting expense:', error);
    return { error: (error as any).message };
  }
}

/**
 * Marque une dépense comme payée
 */
export async function markExpenseAsPaid(expenseId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('expenses').update({
      status: 'paid'
    }).eq('id', expenseId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error marking expense as paid:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère toutes les dépenses
 */
export async function getExpenses(filters?: {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('expense_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('expense_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

/**
 * Récupère les dépenses par catégorie
 */
export async function getExpensesByCategory(startDate?: string, endDate?: string) {
  try {
    let query = supabase.from('expenses').select('category, amount');
    
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Grouper par catégorie
    const grouped = data?.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = 0;
      }
      acc[item.category] += item.amount;
      return acc;
    }, {});

    return grouped || {};
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    return {};
  }
}

/**
 * Récupère le total des dépenses pour une période
 */
export async function getTotalExpenses(startDate?: string, endDate?: string): Promise<number> {
  try {
    let query = supabase.from('expenses').select('amount').in('status', ['approved', 'paid']);
    
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.reduce((sum, item) => sum + item.amount, 0) || 0;
  } catch (error) {
    console.error('Error fetching total expenses:', error);
    return 0;
  }
}

/**
 * Récupère les dépenses en attente d'approbation
 */
export async function getPendingExpenses() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'pending')
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pending expenses:', error);
    return [];
  }
}

/**
 * Modifie une dépense
 */
export async function updateExpense(expenseId: string, params: Partial<ExpenseParams>): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('expenses').update({
      ...params,
      updated_at: new Date().toISOString()
    }).eq('id', expenseId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error updating expense:', error);
    return { error: (error as any).message };
  }
}

/**
 * Supprime une dépense (logique)
 */
export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('expenses').update({
      status: 'cancelled'
    }).eq('id', expenseId);

    if (error) throw error;

    // Annuler la transaction associée
    const { data: expense } = await supabase.from('expenses').select('reference').eq('id', expenseId).single();
    if (expense) {
      await supabase.from('transactions').update({ status: 'cancelled' }).eq('source_reference', expense.reference);
    }

    return {};
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère les fournisseurs uniques
 */
export async function getSuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('supplier')
      .not('supplier', 'is', null)
      .order('supplier');

    if (error) throw error;

    const uniqueSuppliers = [...new Set(data?.map(item => item.supplier).filter(Boolean))];
    return uniqueSuppliers;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

/**
 * Formate le libellé d'une catégorie de dépense
 */
export function formatExpenseCategory(category: string): string {
  const labels: Record<string, string> = {
    supplier: 'Achat fournisseur',
    medical_equipment: 'Matériel médical',
    maintenance: 'Maintenance',
    supplies: 'Fournitures',
    salary: 'Salaires',
    other: 'Autre'
  };
  return labels[category] || category;
}

/**
 * Formate le statut d'une dépense
 */
export function formatExpenseStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    paid: 'Payé'
  };
  return labels[status] || status;
}
