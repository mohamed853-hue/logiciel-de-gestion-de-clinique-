import { supabase } from './supabase';
import { generatePrescriptionReference } from './referenceGenerator';

/**
 * Service de gestion des ordonnances
 * Gère les ordonnances, leur délivrance et le stock automatique
 */

export interface PrescriptionItem {
  medicine_name: string;
  dosage?: string;
  quantity: number;
  instructions?: string;
}

export interface PrescriptionParams {
  patient_id: string;
  doctor_id: string;
  doctor_name?: string;
  items: PrescriptionItem[];
  notes?: string;
  prescription_date?: string;
}

/**
 * Crée une nouvelle ordonnance
 */
export async function createPrescription(params: PrescriptionParams): Promise<{ prescription?: any; error?: string }> {
  try {
    const prescriptionReference = await generatePrescriptionReference();

    const { data: prescription, error: prescriptionError } = await supabase.from('prescriptions').insert([{
      reference: prescriptionReference,
      patient_id: params.patient_id,
      doctor_id: params.doctor_id,
      doctor_name: params.doctor_name,
      prescription_date: params.prescription_date || new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: params.notes,
    }]).select().single();

    if (prescriptionError) throw prescriptionError;

    // Créer les lignes de l'ordonnance
    const prescriptionItems = params.items.map(item => ({
      prescription_id: prescription.id,
      ...item
    }));

    const { error: itemsError } = await supabase.from('prescription_items').insert(prescriptionItems);
    if (itemsError) throw itemsError;

    return { prescription };
  } catch (error) {
    console.error('Error creating prescription:', error);
    return { error: (error as any).message };
  }
}

/**
 * Délivre une ordonnance (partiellement ou complètement)
 * Décrémente automatiquement le stock
 */
export async function deliverPrescription(params: {
  prescription_id: string;
  items: Array<{
    item_id: string;
    quantity_to_deliver: number;
  }>;
  pharmacist_id: string;
}): Promise<{ error?: string }> {
  try {
    // Récupérer l'ordonnance
    const { data: prescription } = await supabase.from('prescriptions').select('*').eq('id', params.prescription_id).single();
    if (!prescription) return { error: 'Ordonnance non trouvée' };

    // Pour chaque item, délivrer et décrémenter le stock
    for (const item of params.items) {
      // Récupérer l'item de l'ordonnance
      const { data: prescriptionItem } = await supabase.from('prescription_items').select('*').eq('id', item.item_id).single();
      if (!prescriptionItem) continue;

      // Récupérer le médicament correspondant dans le stock
      const { data: stockItem } = await supabase.from('pharmacy_stock').select('*').ilike('medicine_name', `%${prescriptionItem.medicine_name}%`).single();
      if (!stockItem) continue;

      // Vérifier le stock disponible
      if (stockItem.quantity_available < item.quantity_to_deliver) {
        return { error: `Stock insuffisant pour ${prescriptionItem.medicine_name}` };
      }

      // Décrémenter le stock
      const { error: stockError } = await supabase.from('pharmacy_stock').update({
        quantity_available: stockItem.quantity_available - item.quantity_to_deliver,
        updated_at: new Date().toISOString()
      }).eq('id', stockItem.id);

      if (stockError) throw stockError;

      // Enregistrer dans l'historique du stock
      await supabase.from('pharmacy_stock_history').insert([{
        stock_id: stockItem.id,
        operation_type: 'sale',
        quantity: -item.quantity_to_deliver,
        quantity_before: stockItem.quantity_available,
        quantity_after: stockItem.quantity_available - item.quantity_to_deliver,
        reference: prescription.reference,
        notes: `Délivrance ordonnance: ${prescription.reference}`,
      }]);

      // Mettre à jour la quantité délivrée dans l'ordonnance
      await supabase.from('prescription_items').update({
        delivered_quantity: prescriptionItem.delivered_quantity + item.quantity_to_deliver
      }).eq('id', item.item_id);
    }

    // Mettre à jour le statut de l'ordonnance
    const { data: updatedItems } = await supabase.from('prescription_items').select('*').eq('prescription_id', params.prescription_id);
    if (updatedItems) {
      const allDelivered = updatedItems.every(item => item.delivered_quantity >= item.quantity);
      const partiallyDelivered = updatedItems.some(item => item.delivered_quantity > 0);

      let newStatus = prescription.status;
      if (allDelivered) {
        newStatus = 'delivered';
      } else if (partiallyDelivered) {
        newStatus = 'partially_delivered';
      }

      await supabase.from('prescriptions').update({
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', params.prescription_id);
    }

    return {};
  } catch (error) {
    console.error('Error delivering prescription:', error);
    return { error: (error as any).message };
  }
}

/**
 * Annule une ordonnance
 */
export async function cancelPrescription(prescriptionId: string, reason: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('prescriptions').update({
      status: 'cancelled',
      notes: reason,
      updated_at: new Date().toISOString()
    }).eq('id', prescriptionId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error cancelling prescription:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère toutes les ordonnances
 */
export async function getPrescriptions(filters?: {
  patient_id?: string;
  doctor_id?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase.from('prescriptions').select('*').order('prescription_date', { ascending: false });

    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters?.doctor_id) {
      query = query.eq('doctor_id', filters.doctor_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('prescription_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('prescription_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return [];
  }
}

/**
 * Récupère les ordonnances en attente de délivrance
 */
export async function getPendingPrescriptions() {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .in('status', ['pending', 'partially_delivered'])
      .order('prescription_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching pending prescriptions:', error);
    return [];
  }
}

/**
 * Récupère les détails d'une ordonnance avec ses items
 */
export async function getPrescriptionDetails(prescriptionId: string) {
  try {
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    if (prescriptionError) throw prescriptionError;

    const { data: items, error: itemsError } = await supabase
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', prescriptionId);

    if (itemsError) throw itemsError;

    return { ...prescription, items };
  } catch (error) {
    console.error('Error fetching prescription details:', error);
    return null;
  }
}

/**
 * Récupère les ordonnances d'un patient
 */
export async function getPatientPrescriptions(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('prescription_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    return [];
  }
}

/**
 * Modifie une ordonnance
 */
export async function updatePrescription(prescriptionId: string, params: Partial<PrescriptionParams>): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('prescriptions').update({
      ...params,
      updated_at: new Date().toISOString()
    }).eq('id', prescriptionId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error updating prescription:', error);
    return { error: (error as any).message };
  }
}

/**
 * Modifie un item d'ordonnance
 */
export async function updatePrescriptionItem(itemId: string, params: Partial<PrescriptionItem>): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('prescription_items').update(params).eq('id', itemId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error updating prescription item:', error);
    return { error: (error as any).message };
  }
}

/**
 * Vérifie si une ordonnance peut être délivrée (stock disponible)
 */
export async function canDeliverPrescription(prescriptionId: string): Promise<{ canDeliver: boolean; unavailableItems?: string[] }> {
  try {
    const { data: items } = await supabase.from('prescription_items').select('*').eq('prescription_id', prescriptionId);
    if (!items) return { canDeliver: false };

    const unavailableItems: string[] = [];

    for (const item of items) {
      const { data: stockItem } = await supabase.from('pharmacy_stock').select('*').ilike('medicine_name', `%${item.medicine_name}%`).single();
      if (!stockItem || stockItem.quantity_available < (item.quantity - item.delivered_quantity)) {
        unavailableItems.push(item.medicine_name);
      }
    }

    return { canDeliver: unavailableItems.length === 0, unavailableItems };
  } catch (error) {
    console.error('Error checking prescription deliverability:', error);
    return { canDeliver: false };
  }
}

/**
 * Formate le statut d'une ordonnance
 */
export function formatPrescriptionStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    partially_delivered: 'Partiellement délivrée',
    delivered: 'Délivrée',
    cancelled: 'Annulée'
  };
  return labels[status] || status;
}

/**
 * Récupère les statistiques d'ordonnances pour une période
 */
export async function getPrescriptionStatistics(startDate?: string, endDate?: string) {
  try {
    let query = supabase.from('prescriptions').select('*');
    
    if (startDate) {
      query = query.gte('prescription_date', startDate);
    }
    if (endDate) {
      query = query.lte('prescription_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const total = data?.length || 0;
    const delivered = data?.filter(p => p.status === 'delivered').length || 0;
    const pending = data?.filter(p => p.status === 'pending').length || 0;
    const partiallyDelivered = data?.filter(p => p.status === 'partially_delivered').length || 0;
    const cancelled = data?.filter(p => p.status === 'cancelled').length || 0;

    return {
      total,
      delivered,
      pending,
      partiallyDelivered,
      cancelled,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0
    };
  } catch (error) {
    console.error('Error calculating prescription statistics:', error);
    return {
      total: 0,
      delivered: 0,
      pending: 0,
      partiallyDelivered: 0,
      cancelled: 0,
      deliveryRate: 0
    };
  }
}
