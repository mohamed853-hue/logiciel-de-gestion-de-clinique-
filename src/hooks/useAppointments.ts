import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Appointment } from '../types';

interface UseAppointmentsOptions {
  patientId?: string;
  doctorId?: string;
  doctorName?: string;
  status?: string;
  todayOnly?: boolean;
  limit?: number;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { patientId, doctorId, doctorName, status, todayOnly, limit } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (patientId) query = query.eq('patient_id', patientId);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      if (doctorName) query = query.eq('doctor_name', doctorName);
      if (status) query = query.eq('status', status);
      if (limit) query = query.limit(limit);

      if (todayOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query
          .gte('appointment_date', today.toISOString())
          .lt('appointment_date', tomorrow.toISOString());
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setAppointments(data || []);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorId, doctorName, status, todayOnly, limit]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const { error: err } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);
      if (err) throw err;
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  return { appointments, loading, error, reload: load, updateStatus };
}

// Stats rendez-vous
export function useAppointmentStats() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [total, todayRes, pending, completed] = await Promise.all([
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .gte('appointment_date', today.toISOString())
            .lt('appointment_date', tomorrow.toISOString()),
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .in('status', ['planifie', 'confirme', 'en_attente']),
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .eq('status', 'termine'),
        ]);

        setStats({
          total: total.count || 0,
          today: todayRes.count || 0,
          pending: pending.count || 0,
          completed: completed.count || 0,
        });
      } catch {
        // silently fail
      }
    };
    loadStats();
  }, []);

  return stats;
}
