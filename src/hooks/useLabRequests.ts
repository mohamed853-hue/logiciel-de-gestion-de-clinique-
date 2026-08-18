import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { LabTest, LabParamResult } from '../types';

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
    consultation_id?: string;
    tests: Array<{ name: string; category?: string }>;
    urgence?: boolean;
    clinical_indication?: string;
    clinical_notes?: string;
    patient_fasting?: boolean;
    on_antibiotics?: boolean;
    gestational_age_sa?: string;
    sample_type?: string;
  }) => {
    try {
      const inserts = request.tests.map(test => ({
        patient_id: request.patient_id,
        test_name: test.name,
        requested_by: request.doctor_name,
        doctor_id: request.doctor_id,
        consultation_id: request.consultation_id,
        urgence: request.urgence || false,
        status: 'en_attente',
        clinical_indication: request.clinical_indication || undefined,
        results_text: request.clinical_notes ? `[Renseignements]: ${request.clinical_notes}` : undefined,
        patient_fasting: request.patient_fasting,
        on_antibiotics: request.on_antibiotics,
        gestational_age_sa: request.gestational_age_sa || undefined,
        sample_type: request.sample_type || 'Sang veineux',
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
          title: request.urgence ? '🚨 Demande urgente' : 'Nouvelle prescription d\'analyses',
          message: `${request.tests.length} analyse(s) prescrite(s) par ${request.doctor_name}${request.clinical_indication ? ` · Motif: ${request.clinical_indication}` : ''}`,
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

  const updateSampleStatus = async (id: string, newStatus: 'en_attente' | 'preleve' | 'en_cours' | 'termine') => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'preleve') {
        updateData.sample_taken_at = new Date().toISOString();
      }
      const { error: err } = await supabase
        .from('lab_tests')
        .update(updateData)
        .eq('id', id);
      if (err) throw err;
      await load();
      return true;
    } catch {
      return false;
    }
  };

  const updateResult = async (
    id: string,
    resultText: string,
    validatedBy: string,
    attachment?: { file_url: string; file_name?: string; file_type?: string; file_size?: number },
    structuredResults?: LabParamResult[],
    remarks?: string
  ) => {
    try {
      const payload: any = {
        status: 'termine',
        results_text: resultText,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
      };
      if (remarks) payload.remarks = remarks;
      if (structuredResults && structuredResults.length > 0) {
        payload.structured_results = structuredResults;
      }
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

  return { 
    labTests, 
    loading, 
    error, 
    reload: load, 
    createLabRequest, 
    updateResult,
    updateSampleStatus 
  };
}

// Stats laboratoire
export function useLabStats() {
  const [stats, setStats] = useState({ pending: 0, sampleTaken: 0, inProgress: 0, completed: 0, urgent: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [pending, taken, inProgress, completed, urgent] = await Promise.all([
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'en_attente'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'preleve'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'en_cours'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('status', 'termine'),
          supabase.from('lab_tests').select('id', { count: 'exact', head: true }).eq('urgence', true).neq('status', 'termine'),
        ]);
        setStats({
          pending: pending.count || 0,
          sampleTaken: taken.count || 0,
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

