import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Prescription, PrescriptionItem } from '../types';

interface UsePrescriptionsOptions {
  patientId?: string;
  doctorId?: string;
  status?: string;
  limit?: number;
}

export function usePrescriptions(options: UsePrescriptionsOptions = {}) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { patientId, doctorId, status, limit } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) query = query.eq('patient_id', patientId);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      if (status) query = query.eq('status', status);
      if (limit) query = query.limit(limit);

      const { data, error: err } = await query;
      if (err) throw err;
      // Normaliser les items (JSONB peut être string ou array)
      const normalized = (data || []).map((p: any) => ({
        ...p,
        items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []),
      }));
      setPrescriptions(normalized);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des ordonnances');
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorId, status, limit]);

  useEffect(() => { load(); }, [load]);

  const createPrescription = async (prescription: {
    patient_id: string;
    doctor_id: string;
    doctor_name: string;
    consultation_id?: string;
    items: PrescriptionItem[];
    notes?: string;
  }) => {
    try {
      const id = `PRESC-${Date.now()}`;
      const { error: err } = await supabase.from('prescriptions').insert([{
        id,
        ...prescription,
        status: 'en_attente',
        created_at: new Date().toISOString(),
      }]);
      if (err) throw err;
      await load();
      try {
        await supabase.from('notifications').insert([{
          recipient_role: 'pharmacien',
          type: 'prescription',
          title: 'Nouvelle ordonnance',
          message: `Nouvelle ordonnance de ${prescription.doctor_name} pour un patient`,
          entity_type: 'prescription',
          entity_id: id,
          is_read: false,
        }]);
      } catch {
        // ignore
      }
      return { success: true, id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const deliverPrescription = async (id: string, deliveredBy: string) => {
    try {
      const { error: err } = await supabase
        .from('prescriptions')
        .update({
          status: 'delivree',
          delivered_by: deliveredBy,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw err;
      await load();
      return true;
    } catch {
      return false;
    }
  };

  return { prescriptions, loading, error, reload: load, createPrescription, deliverPrescription };
}
