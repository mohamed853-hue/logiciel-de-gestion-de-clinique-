import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Patient } from '../types';

interface UsePatientOptions {
  limit?: number;
  search?: string;
  status?: string;
  todayOnly?: boolean;
}

interface UsePatientReturn {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  total: number;
}

export function usePatients(options: UsePatientOptions = {}): UsePatientReturn {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const { limit, search, todayOnly } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (limit) query = query.limit(limit);

      if (search && search.trim()) {
        const s = search.trim();
        query = query.or(
          `first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone.ilike.%${s}%,patient_number.ilike.%${s}%`
        );
      }

      if (todayOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      }

      const { data, error: err, count } = await query;
      if (err) throw err;
      setPatients(data || []);
      setTotal(count || 0);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [limit, search, todayOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return { patients, loading, error, reload: load, total };
}

// Hook pour un seul patient
export function usePatient(patientId: string | null) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (err) throw err;
      setPatient(data);
    } catch (e: any) {
      setError(e.message || 'Patient non trouvé');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  return { patient, loading, error, reload: load };
}

// Hook pour les stats patients
export function usePatientStats() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    urgent: 0,
    stable: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [total, todayRes, urgent] = await Promise.all([
          supabase.from('patients').select('id', { count: 'exact', head: true }),
          supabase.from('patients').select('id', { count: 'exact', head: true })
            .gte('created_at', today.toISOString()),
          supabase.from('patients').select('id', { count: 'exact', head: true })
            .in('arrival_status', ['urgent', 'grave', 'critique']),
        ]);

        setStats({
          total: total.count || 0,
          today: todayRes.count || 0,
          urgent: urgent.count || 0,
          stable: (total.count || 0) - (urgent.count || 0),
        });
      } catch {
        // silently fail stats
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return { stats, loading };
}
