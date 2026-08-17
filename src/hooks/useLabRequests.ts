import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { LabTest } from '../types';

interface UseLabRequestsOptions {
  patientId?: string;
  doctorId?: string;
  status?: string;
  limit?: number;
}

export function useLabRequests(options: UseLabRequestsOptions = {}) {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { patientId, doctorId, status, limit } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Essayer lab_requests d'abord, sinon utiliser lab_tests
      let query = supabase
        .from('lab_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) query = query.eq('patient_id', patientId);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      if (status) query = query.eq('status', status);
      if (limit) query = query.limit(limit);

      const { data, error: err } = await query;
      if (err) throw err;
      setLabTests(data || []);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorId, status, limit]);

  useEffect(() => { load(); }, [load]);

  const createLabRequest = async (request: {
    patient_id: string;
    doctor_id?: string;
    doctor_name: string;
    tests: Array<{ name: string; category?: string }>;
    urgence?: boolean;
    clinical_notes?: string;
  }) => {
    try {
      const inserts = request.tests.map(test => ({
        patient_id: request.patient_id,
        test_name: test.name,
        requested_by: request.doctor_name,
        doctor_id: request.doctor_id,
        urgence: request.urgence || false,
        status: 'en_attente',
        created_at: new Date().toISOString(),
      }));

      const { error: err } = await supabase.from('lab_tests').insert(inserts);
      if (err) throw err;
      await load();

      // Notifier le laboratoire
      try {
        await supabase.from('notifications').insert([{
          recipient_role: 'laborantin',
          type: 'lab_result',
          title: request.urgence ? '🚨 Demande urgente' : 'Nouvelle demande d\'analyse',
          message: `${request.tests.length} analyse(s) demandée(s) par ${request.doctor_name}`,
          entity_type: 'lab_request',
          is_read: false,
        }]);
      } catch {
        // ignore
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateResult = async (
    id: string,
    resultText: string,
    validatedBy: string,
    attachment?: { file_url: string; file_name?: string; file_type?: string; file_size?: number }
  ) => {
    try {
      const payload: any = {
        status: 'termine',
        results_text: resultText,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
      };
      if (attachment) {
        payload.file_url = attachment.file_url;
        payload.file_name = attachment.file_name;
        payload.file_type = attachment.file_type;
        payload.file_size = attachment.file_size;
      }
      const { error: err } = await supabase
        .from('lab_tests')
        .update(payload)
        .eq('id', id);
      if (err) throw err;
      await load();
      return true;
    } catch {
      return false;
    }
  };

  return { labTests, loading, error, reload: load, createLabRequest, updateResult };
}

// Stats laboratoire
export function useLabStats() {
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0, urgent: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [pending, inProgress, completed, urgent] = await Promise.all([
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'en_attente'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'en_cours'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'termine'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('urgence', true).eq('status', 'en_attente'),
        ]);
        setStats({
          pending: pending.count || 0,
          inProgress: inProgress.count || 0,
          completed: completed.count || 0,
          urgent: urgent.count || 0,
        });
      } catch { /* silent */ }
    };
    loadStats();
  }, []);

  return stats;
}
