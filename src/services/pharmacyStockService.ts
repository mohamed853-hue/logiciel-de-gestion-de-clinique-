import { supabase } from './supabase';
import { generateStockEntryReference } from './referenceGenerator';

/**
 * Service de gestion du stock pharmacie
 * Gère les entrées, sorties, ajustements et alertes de stock
 */

export interface StockItem {
  medicine_name: string;
  medicine_code?: string;
  barcode?: string;
  category?: string;
  laboratory?: string;
  supplier?: string;
  quantity_available: number;
  minimum_threshold: number;
  purchase_price: number;
  sale_price: number;
  lot_number?: string;
  expiration_date?: string;
  location?: string;
  description?: string;
}

export interface StockEntryParams {
  stock_id: string;
  supplier: string;
  quantity: number;
  purchase_price: number;
  lot_number?: string;
  expiration_date?: string;
  entry_date?: string;
  notes?: string;
}

/**
 * Crée un nouvel article de stock
 */
export async function createStockItem(item: StockItem): Promise<{ stock?: any; error?: string }> {
  try {
    const { data: stock, error } = await supabase.from('pharmacy_stock').insert([{
      ...item,
      is_active: true,
    }]).select().single();

    if (error) throw error;

    return { stock };
  } catch (error) {
    console.error('Error creating stock item:', error);
    return { error: (error as any).message };
  }
}

/**
 * Modifie un article de stock
 */
export async function updateStockItem(stockId: string, item: Partial<StockItem>): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('pharmacy_stock').update({
      ...item,
      updated_at: new Date().toISOString()
    }).eq('id', stockId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error updating stock item:', error);
    return { error: (error as any).message };
  }
}

/**
 * Crée une entrée de stock
 * Incrémente automatiquement le stock disponible
 */
export async function createStockEntry(params: StockEntryParams): Promise<{ entry?: any; error?: string }> {
  try {
    const entryReference = await generateStockEntryReference();

    const { data: entry, error: entryError } = await supabase.from('pharmacy_stock_entries').insert([{
      reference: entryReference,
      stock_id: params.stock_id,
      supplier: params.supplier,
      quantity: params.quantity,
      purchase_price: params.purchase_price,
      lot_number: params.lot_number,
      expiration_date: params.expiration_date,
      entry_date: params.entry_date || new Date().toISOString().split('T')[0],
      notes: params.notes,
    }]).select().single();

    if (entryError) throw entryError;

    // Le trigger SQL va automatiquement incrémenter le stock et enregistrer dans l'historique

    return { entry };
  } catch (error) {
    console.error('Error creating stock entry:', error);
    return { error: (error as any).message };
  }
}

/**
 * Ajuste le stock manuellement
 */
export async function adjustStock(params: {
  stock_id: string;
  quantity: number;
  operation_type: 'adjustment' | 'return' | 'damage' | 'loss';
  reason: string;
}): Promise<{ error?: string }> {
  try {
    // Récupérer le stock actuel
    const { data: stock } = await supabase.from('pharmacy_stock').select('quantity_available').eq('id', params.stock_id).single();
    if (!stock) return { error: 'Article de stock non trouvé' };

    const quantityBefore = stock.quantity_available;
    const quantityAfter = quantityBefore + params.quantity;

    // Mettre à jour le stock
    const { error: updateError } = await supabase.from('pharmacy_stock').update({
      quantity_available: quantityAfter,
      updated_at: new Date().toISOString()
    }).eq('id', params.stock_id);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    const { error: historyError } = await supabase.from('pharmacy_stock_history').insert([{
      stock_id: params.stock_id,
      operation_type: params.operation_type,
      quantity: params.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reference: `AJUST-${Date.now()}`,
      notes: params.reason,
    }]);

    if (historyError) throw historyError;

    return {};
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère tous les articles de stock
 */
export async function getStockItems(filters?: {
  category?: string;
  is_active?: boolean;
  low_stock?: boolean;
  expiring_soon?: boolean;
  expired?: boolean;
}) {
  try {
    let query = supabase.from('pharmacy_stock').select('*').order('medicine_name');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];

    // Filtres supplémentaires
    if (filters?.low_stock) {
      filtered = filtered.filter(item => item.quantity_available <= item.minimum_threshold);
    }
    if (filters?.expiring_soon) {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => 
        item.expiration_date && new Date(item.expiration_date) < thirtyDaysFromNow
      );
    }
    if (filters?.expired) {
      filtered = filtered.filter(item => 
        item.expiration_date && new Date(item.expiration_date) < new Date()
      );
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching stock items:', error);
    return [];
  }
}

/**
 * Récupère les alertes de stock
 */
export async function getStockAlerts() {
  try {
    const { data: stock, error } = await supabase.from('pharmacy_stock').select('*').eq('is_active', true);
    if (error) throw error;

    const alerts = {
      lowStock: stock.filter(item => item.quantity_available <= item.minimum_threshold),
      expired: stock.filter(item => item.expiration_date && new Date(item.expiration_date) < new Date()),
      expiringSoon: stock.filter(item => {
        if (!item.expiration_date) return false;
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return new Date(item.expiration_date) < thirtyDaysFromNow && new Date(item.expiration_date) >= new Date();
      }),
    };

    return alerts;
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return { lowStock: [], expired: [], expiringSoon: [] };
  }
}

/**
 * Récupère les entrées de stock
 */
export async function getStockEntries(filters?: {
  stock_id?: string;
  supplier?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('pharmacy_stock_entries').select('*').order('entry_date', { ascending: false });

    if (filters?.stock_id) {
      query = query.eq('stock_id', filters.stock_id);
    }
    if (filters?.supplier) {
      query = query.eq('supplier', filters.supplier);
    }
    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stock entries:', error);
    return [];
  }
}

/**
 * Récupère l'historique du stock
 */
export async function getStockHistory(filters?: {
  stock_id?: string;
  operation_type?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('pharmacy_stock_history').select('*').order('created_at', { ascending: false });

    if (filters?.stock_id) {
      query = query.eq('stock_id', filters.stock_id);
    }
    if (filters?.operation_type) {
      query = query.eq('operation_type', filters.operation_type);
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
    console.error('Error fetching stock history:', error);
    return [];
  }
}

/**
 * Récupère les catégories de médicaments
 */
export async function getMedicineCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pharmacy_stock')
      .select('category')
      .not('category', 'is', null)
      .order('category');

    if (error) throw error;

    const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))];
    return uniqueCategories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Récupère les fournisseurs
 */
export async function getSuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pharmacy_stock')
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
 * Désactive un article de stock (suppression logique)
 */
export async function deactivateStockItem(stockId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('pharmacy_stock').update({
      is_active: false,
      updated_at: new Date().toISOString()
    }).eq('id', stockId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error deactivating stock item:', error);
    return { error: (error as any).message };
  }
}

/**
 * Réactive un article de stock
 */
export async function reactivateStockItem(stockId: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('pharmacy_stock').update({
      is_active: true,
      updated_at: new Date().toISOString()
    }).eq('id', stockId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error reactivating stock item:', error);
    return { error: (error as any).message };
  }
}

/**
 * Calcule la valeur totale du stock
 */
export async function getTotalStockValue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('pharmacy_stock')
      .select('quantity_available, purchase_price')
      .eq('is_active', true);

    if (error) throw error;

    return data?.reduce((sum, item) => sum + (item.quantity_available * item.purchase_price), 0) || 0;
  } catch (error) {
    console.error('Error calculating total stock value:', error);
    return 0;
  }
}

/**
 * Calcule la valeur de vente potentielle du stock
 */
export async function getTotalStockSaleValue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('pharmacy_stock')
      .select('quantity_available, sale_price')
      .eq('is_active', true);

    if (error) throw error;

    return data?.reduce((sum, item) => sum + (item.quantity_available * item.sale_price), 0) || 0;
  } catch (error) {
    console.error('Error calculating total stock sale value:', error);
    return 0;
  }
}

/**
 * Recherche des médicaments
 */
export async function searchMedicines(query: string) {
  try {
    const { data, error } = await supabase
      .from('pharmacy_stock')
      .select('*')
      .or(`medicine_name.ilike.%${query}%,medicine_code.ilike.%${query}%,barcode.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching medicines:', error);
    return [];
  }
}

/**
 * Formate le type d'opération de stock
 */
export function formatStockOperationType(type: string): string {
  const labels: Record<string, string> = {
    entry: 'Entrée',
    sale: 'Vente',
    return: 'Retour',
    adjustment: 'Ajustement',
    expiration: 'Expiration',
    transfer: 'Transfert',
    damage: 'Dégât',
    loss: 'Perte'
  };
  return labels[type] || type;
}
