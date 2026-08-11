import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PatientProfile } from '../components/PatientProfile';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  TrendingUp,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  History,
  BarChart3,
  UserPlus,
  Baby,
  Activity,
  Eye,
  Plus,
  CreditCard,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { Patient, Appointment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DoctorOption {
  id: string;
  name: string;
  role: string;
  service?: string;
}

const RELATION_OPTIONS = [
  'Mari',
  'Femme',
  'Père',
  'Mère',
  'Frère',
  'Sœur',
  'Fils',
  'Fille',
  'Proche',
  'Autre'
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'payments' | 'cashier' | 'history' | 'stats'>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Formulaire nouveau patient
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    age: '',
    sex: '',
    phone: '',
    blood: '',
    allergies: '',
    address: '',
    city: '',
    country: 'Algérie',
    visit_reason: 'Consultation',
    visit_reason_other: '',
    arrival_status: 'stable',
    // Accompagnant
    is_accompanied: false,
    accompanier_first_name: '',
    accompanier_last_name: '',
    accompanier_phone: '',
    accompanier_relationship: 'Mari',
    // Patiente enceinte
    is_pregnant: false,
    pregnancy_months: '',
    pregnancy_weeks: '',
    ddr: '',
    dpa: '',
    pregnancy_notes: '',
  });

  // Formulaire rendez-vous
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    doctor_id: '',
    doctor_name: '',
    appointment_date: '',
    priority: 'normal',
    visit_type: 'consultation',
    notes: ''
  });

  useEffect(() => {
    loadPatients();
    loadAppointments();
    loadDoctors();
  }, []);

  // Changement d'onglet via la sidebar (CustomEvent)
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'appointments' || path === '/dashboard/appointments') setActiveTab('appointments');
      else if (path === 'payments' || path === '/dashboard/payments') setActiveTab('payments');
      else if (path === 'history' || path === '/dashboard/history') setActiveTab('history');
      else if (path === 'stats' || path === '/dashboard/stats') setActiveTab('stats');
      else if (path === 'cashier' || path === '/dashboard/cashier') setActiveTab('cashier');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, name, role, service')
        .in('role', ['medecin', 'gynecologue']);
      if (error) throw error;
      setDoctorsList(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  // Calculs dynamiques grossesse (Mois <-> SA <-> DDR <-> DPA)
  const handleMonthsChange = (monthsStr: string) => {
    const months = parseFloat(monthsStr);
    if (!isNaN(months) && months > 0) {
      const weeks = Math.round(months * 4.33);
      const now = new Date();
      const ddrDate = new Date(now.getTime() - Math.round(months * 30.43 * 86400000));
      const dpaDate = new Date(ddrDate.getTime() + 280 * 86400000);

      setNewPatient(prev => ({
        ...prev,
        pregnancy_months: monthsStr,
        pregnancy_weeks: weeks.toString(),
        ddr: ddrDate.toISOString().split('T')[0],
        dpa: dpaDate.toISOString().split('T')[0]
      }));
    } else {
      setNewPatient(prev => ({ ...prev, pregnancy_months: monthsStr }));
    }
  };

  const handleDdrChange = (ddrVal: string) => {
    if (ddrVal) {
      const ddrDate = new Date(ddrVal);
      if (!isNaN(ddrDate.getTime())) {
        const now = new Date();
        const diffTime = Math.max(0, now.getTime() - ddrDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const months = (diffDays / 30.43).toFixed(1);

        const dpaDate = new Date(ddrDate.getTime() + 280 * 86400000);

        setNewPatient(prev => ({
          ...prev,
          ddr: ddrVal,
          pregnancy_weeks: weeks.toString(),
          pregnancy_months: months,
          dpa: dpaDate.toISOString().split('T')[0]
        }));
        return;
      }
    }
    setNewPatient(prev => ({ ...prev, ddr: ddrVal }));
  };

  const handleNewPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim()) {
      setSuccessMessage({ show: true, message: 'Erreur: Prénom, Nom et Téléphone sont obligatoires.' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 4000);
      return;
    }

    try {
      const now = new Date();
      const arrivalTimeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const arrivalDateString = now.toLocaleDateString('fr-FR');
      const formattedArrivalTime = `Date: ${arrivalDateString} | Heure: ${arrivalTimeString}`;

      // Générer numéro patient auto P-YYYYMMDD-XXX
      const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const patientNumber = `P-${datePrefix}-${randomSuffix}`;

      const finalVisitReason = newPatient.visit_reason === 'Autre'
        ? (newPatient.visit_reason_other.trim() || 'Autre')
        : newPatient.visit_reason;

      // 1. Enregistrer l'Accompagnant si présent
      let accompanierId = null;
      if (newPatient.is_accompanied && newPatient.accompanier_first_name) {
        const { data: accData, error: accErr } = await supabase.from('accompaniers').insert([{
          id: crypto.randomUUID(),
          first_name: newPatient.accompanier_first_name.trim(),
          last_name: newPatient.accompanier_last_name.trim(),
          phone: newPatient.accompanier_phone.trim(),
          relationship: newPatient.accompanier_relationship,
          created_at: now.toISOString()
        }]).select();
        if (!accErr && accData?.[0]) {
          accompanierId = accData[0].id;
        }
      }

      const isPregnantFinal = newPatient.sex === 'F' && (newPatient.is_pregnant || newPatient.visit_reason === 'Grossesse');

      // 2. Patient
      const patientDataToInsert: any = {
        id: crypto.randomUUID(),
        patient_number: patientNumber,
        name: `${newPatient.first_name.trim()} ${newPatient.last_name.trim()}`,
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        age: newPatient.age ? parseInt(newPatient.age) : null,
        sex: newPatient.sex || null,
        phone: newPatient.phone.trim(),
        blood: newPatient.blood || null,
        allergies: newPatient.allergies.trim() || 'Aucune',
        address: newPatient.address.trim() || null,
        city: newPatient.city.trim() || null,
        country: newPatient.country || 'Algérie',
        visit_reason: finalVisitReason,
        arrival_status: newPatient.arrival_status,
        arrival_time: now.toISOString(),
        arrival_at: now.toISOString(),
        is_accompanied: newPatient.is_accompanied,
        accompanier_id: accompanierId,
        is_pregnant: isPregnantFinal,
        created_at: now.toISOString(),
      };

      const { data: insertedPatient, error: pErr } = await supabase
        .from('patients')
        .insert([patientDataToInsert])
        .select();

      if (pErr) throw pErr;

      // 3. Synchronisation Auto Gynécologue si Patiente Enceinte
      if (isPregnantFinal && insertedPatient?.[0]) {
        const ddrDate = newPatient.ddr || now.toISOString().slice(0, 10);
        const dpaDate = newPatient.dpa || new Date(now.getTime() + 280 * 86400000).toISOString().slice(0, 10);

        try {
          await supabase.from('gyn_grossesses').insert([{
            patient_id: insertedPatient[0].id,
            date_debut_grossesse: ddrDate,
            date_terme_prevu: dpaDate,
            statut: 'en_cours',
            remarques: `Mois: ${newPatient.pregnancy_months || '-'}, SA: ${newPatient.pregnancy_weeks || '-'} | Accompagnant: ${newPatient.is_accompanied ? newPatient.accompanier_relationship : 'Non'}`,
            created_at: now.toISOString(),
          }]);
        } catch {
          // ignore
        }
      }

      setShowNewPatientForm(false);
      setNewPatient({
        first_name: '', last_name: '', age: '', sex: '', phone: '', blood: '', allergies: '',
        address: '', city: '', country: 'Algérie', visit_reason: 'Consultation', visit_reason_other: '',
        arrival_status: 'stable', is_accompanied: false, accompanier_first_name: '', accompanier_last_name: '',
        accompanier_phone: '', accompanier_relationship: 'Mari', is_pregnant: false, pregnancy_months: '',
        pregnancy_weeks: '', ddr: '', dpa: '', pregnancy_notes: ''
      });

      loadPatients();
      setSuccessMessage({ show: true, message: `Patient #${patientNumber} enregistré ! (${formattedArrivalTime})` });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 5000);
    } catch (error: any) {
      console.error('Error creating patient:', error);
      setSuccessMessage({ show: true, message: 'Erreur d\'enregistrement: ' + (error.message || '') });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 4000);
    }
  };

  const handleNewAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.patient_id || !newAppointment.doctor_name || !newAppointment.appointment_date) {
      setSuccessMessage({ show: true, message: 'Veuillez choisir un patient, un médecin et la date.' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 4000);
      return;
    }

    try {
      const selectedPatient = patients.find(p => p.id === newAppointment.patient_id);
      const { error } = await supabase.from('appointments').insert([{
        patient_id: newAppointment.patient_id,
        patient_name: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name || selectedPatient.name}` : '',
        doctor_id: newAppointment.doctor_id || null,
        doctor_name: newAppointment.doctor_name,
        appointment_date: newAppointment.appointment_date,
        priority: newAppointment.priority,
        visit_type: newAppointment.visit_type,
        notes: newAppointment.notes || null,
        status: 'planifie',
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      setShowAppointmentForm(false);
      setNewAppointment({ patient_id: '', doctor_id: '', doctor_name: '', appointment_date: '', priority: 'normal', visit_type: 'consultation', notes: '' });
      loadAppointments();
      setSuccessMessage({ show: true, message: 'Rendez-vous créé avec succès !' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 4000);
    } catch (error: any) {
      setSuccessMessage({ show: true, message: 'Erreur RDV: ' + (error.message || '') });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 4000);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
      await supabase.from('appointments').update({ status }).eq('id', id);
      loadAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  // Patients filtrés
  const filteredPatients = patients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery) ||
    p.patient_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayCount = patients.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const urgentCount = patients.filter(p =>
    ['urgent', 'grave', 'critique'].includes(p.arrival_status || '')
  ).length;

  // Données stats graphiques
  const reasonStats = (() => {
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      const r = p.visit_reason || 'Consultation';
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const conditionStats = (() => {
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      const c = p.arrival_status || 'stable';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {successMessage.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-medium animate-slide-in ${
          successMessage.message.includes('Erreur') 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {successMessage.message.includes('Erreur') ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
          <span>{successMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Accueil & Réception <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Enregistrement des arrivées et orientation des dossiers médicaux</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAppointmentForm(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Planifier RDV
          </Button>
          <Button onClick={() => setShowNewPatientForm(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau Patient
          </Button>
        </div>
      </div>

      {/* Interactive Tabs Bar */}
      <div className="flex gap-1 border-b border-slate-200 bg-white/70 backdrop-blur p-1 rounded-2xl shadow-sm overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: <Activity className="w-4 h-4" /> },
          { id: 'patients', label: `Patients (${patients.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'appointments', label: `Rendez-vous (${appointments.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'payments', label: 'Paiement Soins', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'cashier', label: 'Caisse', icon: <ShoppingCart className="w-4 h-4" /> },
          { id: 'history', label: 'Historique File', icon: <History className="w-4 h-4" /> },
          { id: 'stats', label: 'Statistiques', icon: <BarChart3 className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap',
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Animated Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card onClick={() => setActiveTab('patients')} className="stat-card-motion border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600 text-white cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-100">Patients Aujourd'hui</p>
                  <p className="text-3xl font-bold text-white mt-1">{todayCount}</p>
                  <p className="text-[11px] text-blue-200 mt-2 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Enregistrés à l'accueil
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card onClick={() => setActiveTab('appointments')} className="stat-card-motion border-0 shadow-sm bg-gradient-to-br from-purple-500 to-indigo-600 text-white cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-100">Rendez-vous du Jour</p>
                  <p className="text-3xl font-bold text-white mt-1">{appointments.length}</p>
                  <p className="text-[11px] text-purple-200 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Planifiés
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card onClick={() => setActiveTab('patients')} className="stat-card-motion border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-100">Urgences / Graves</p>
                  <p className="text-3xl font-bold text-white mt-1">{urgentCount}</p>
                  <p className="text-[11px] text-red-200 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> À prendre en charge
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card onClick={() => setActiveTab('patients')} className="stat-card-motion border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-100">Total Patients Clinique</p>
                  <p className="text-3xl font-bold text-white mt-1">{patients.length}</p>
                  <p className="text-[11px] text-emerald-200 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Base globale
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Queue Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Arrivées Récentes & File d'Attente
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('patients')}>
                  Voir Tout <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState type="table" rows={5} />
              ) : patients.length === 0 ? (
                <EmptyState title="Aucun patient enregistré" description="Cliquez sur Nouveau Patient pour commencer." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                        <th className="text-left py-3 px-3">Patient</th>
                        <th className="text-left py-3 px-3">Motif & Heure</th>
                        <th className="text-left py-3 px-3">Téléphone</th>
                        <th className="text-center py-3 px-3">État</th>
                        <th className="text-right py-3 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.slice(0, 6).map(patient => (
                        <tr
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                {patient.first_name?.[0]}{patient.last_name?.[0] || patient.name?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {patient.first_name} {patient.last_name || patient.name}
                                </p>
                                {patient.patient_number && (
                                  <p className="text-[10px] text-slate-400 font-mono">#{patient.patient_number}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-700">{patient.visit_reason || 'Consultation'}</p>
                            <p className="text-xs text-slate-400">
                              {patient.arrival_time || patient.arrival_at ? new Date(patient.arrival_time || patient.arrival_at!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                            {patient.phone}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <StatusBadge status={patient.arrival_status || 'stable'} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}>
                              <Eye className="w-4 h-4 mr-1 text-blue-600" />
                              Profil
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PATIENTS */}
      {activeTab === 'patients' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Tous les Patients Enregistrés</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    placeholder="Rechercher par nom, tél, N°..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowNewPatientForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-1" /> Nouveau
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={8} />
            ) : filteredPatients.length === 0 ? (
              <EmptyState type="search" description="Aucun patient trouvé." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                      <th className="text-left py-3 px-3">Patient</th>
                      <th className="text-left py-3 px-3">N° Patient</th>
                      <th className="text-left py-3 px-3">Motif</th>
                      <th className="text-left py-3 px-3">Téléphone</th>
                      <th className="text-center py-3 px-3">État</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(patient => (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {patient.first_name} {patient.last_name || patient.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-500">
                          #{patient.patient_number || 'P-000'}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{patient.visit_reason || 'Consultation'}</td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600">{patient.phone}</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={patient.arrival_status || 'stable'} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}>
                            <Eye className="w-4 h-4 mr-1 text-blue-600" /> Dossier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-base">Gestion des Rendez-vous</CardTitle>
              <Button onClick={() => setShowAppointmentForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nouveau RDV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <EmptyState title="Aucun rendez-vous planifié" />
            ) : (
              <div className="space-y-3">
                {appointments.map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{a.patient_name || 'Patient'}</p>
                      <p className="text-slate-500">Médecin: <strong className="text-slate-700">{a.doctor_name}</strong></p>
                      <p className="text-slate-400 mt-1">Date: {new Date(a.appointment_date).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.status === 'planifie' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateAppointmentStatus(a.id, 'confirme')}>
                          Confirmer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'payments' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Paiements des Soins & Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center text-slate-400 text-sm">
              Section encaissement des frais de consultation et actes médicaux à la Réception.
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: CASHIER */}
      {activeTab === 'cashier' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Point de Vente & Caisse Réception</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center text-slate-400 text-sm">
              Accès direct aux opérations de caisse quotidienne.
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: HISTORY */}
      {activeTab === 'history' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Historique des Arrivées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patients.slice(0, 10).map(p => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{p.first_name} {p.last_name || p.name}</span>
                    <span className="text-slate-400 ml-2">Enregistré le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <StatusBadge status={p.arrival_status || 'stable'} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 7: STATS */}
      {activeTab === 'stats' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Répartition par Motif de Venue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={reasonStats} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {reasonStats.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Répartition par État du Patient à l'Arrivée</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={conditionStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Formulaire Nouveau Patient */}
      {showNewPatientForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-8 animate-fade-in">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-blue-200" />
                <div>
                  <h2 className="font-bold text-lg">Enregistrer un Nouveau Patient</h2>
                  <p className="text-xs text-blue-200">Arrivée et numéro de dossier générés automatiquement</p>
                </div>
              </div>
              <button onClick={() => setShowNewPatientForm(false)} className="p-1 rounded-lg hover:bg-white/10">
                <XCircle className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleNewPatientSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Identité */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Identité du Patient</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Prénom *"
                    value={newPatient.first_name}
                    onChange={e => setNewPatient({ ...newPatient, first_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Nom *"
                    value={newPatient.last_name}
                    onChange={e => setNewPatient({ ...newPatient, last_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Téléphone *"
                    value={newPatient.phone}
                    onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                    required
                  />
                  <Input
                    label="Âge"
                    type="number"
                    value={newPatient.age}
                    onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                  />
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Sexe</label>
                    <select
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newPatient.sex}
                      onChange={e => setNewPatient({ ...newPatient, sex: e.target.value })}
                    >
                      <option value="">Non spécifié</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Groupe Sanguin</label>
                    <select
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newPatient.blood}
                      onChange={e => setNewPatient({ ...newPatient, blood: e.target.value })}
                    >
                      <option value="">Non spécifié</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Motif de venue & État d'arrivée */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> 2. Motif de venue & État à l'arrivée
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Motif de venue *</label>
                    <select
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                      value={newPatient.visit_reason}
                      onChange={e => setNewPatient({ ...newPatient, visit_reason: e.target.value })}
                    >
                      <option value="Consultation">Consultation générale</option>
                      <option value="Maladie">Maladie</option>
                      <option value="Accident">Accident / Traumatisme</option>
                      <option value="Urgence">Urgence médicale</option>
                      <option value="Suivi">Suivi médical</option>
                      <option value="Contrôle">Contrôle</option>
                      <option value="Douleur">Douleur aiguë</option>
                      <option value="Grossesse">Suivi de Grossesse</option>
                      <option value="Autre">Autre motif...</option>
                    </select>
                  </div>

                  {newPatient.visit_reason === 'Autre' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Préciser le motif *</label>
                      <input
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: Certificat..."
                        value={newPatient.visit_reason_other}
                        onChange={e => setNewPatient({ ...newPatient, visit_reason_other: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">État du patient à l'arrivée *</label>
                    <select
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                      value={newPatient.arrival_status}
                      onChange={e => setNewPatient({ ...newPatient, arrival_status: e.target.value })}
                    >
                      <option value="stable">🟢 Stable</option>
                      <option value="surveiller">🟡 À surveiller</option>
                      <option value="urgent">🟠 Urgent</option>
                      <option value="grave">🔴 Grave</option>
                      <option value="critique">🚨 Critique</option>
                      <option value="inconscient">🟣 Inconscient</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Patiente Enceinte (Dynamic avec Calcul Auto) */}
              {newPatient.sex === 'F' && (
                <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-pink-900 flex items-center gap-2">
                      <Baby className="w-4 h-4 text-pink-600" /> La patiente est-elle enceinte ?
                    </label>
                    <div className="flex gap-3 text-xs">
                      <label className="flex items-center gap-1 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="is_pregnant"
                          checked={!newPatient.is_pregnant}
                          onChange={() => setNewPatient({ ...newPatient, is_pregnant: false })}
                        /> Non
                      </label>
                      <label className="flex items-center gap-1 font-semibold text-pink-700 cursor-pointer">
                        <input
                          type="radio"
                          name="is_pregnant"
                          checked={newPatient.is_pregnant}
                          onChange={() => setNewPatient({ ...newPatient, is_pregnant: true })}
                        /> Oui
                      </label>
                    </div>
                  </div>

                  {newPatient.is_pregnant && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 animate-fade-in text-xs">
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Nombre de mois</label>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Ex: 5"
                          className="w-full px-3 py-1.5 border border-pink-300 rounded-xl outline-none bg-white font-bold text-pink-900"
                          value={newPatient.pregnancy_months}
                          onChange={e => handleMonthsChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Semaines (SA)</label>
                        <input
                          type="number"
                          placeholder="Ex: 22"
                          className="w-full px-3 py-1.5 border border-pink-300 rounded-xl outline-none bg-white font-bold text-pink-900"
                          value={newPatient.pregnancy_weeks}
                          onChange={e => setNewPatient({ ...newPatient, pregnancy_weeks: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Dernières règles (DDR)</label>
                        <input
                          type="date"
                          className="w-full px-3 py-1.5 border border-pink-300 rounded-xl outline-none bg-white"
                          value={newPatient.ddr}
                          onChange={e => handleDdrChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Terme prévu (DPA calculé)</label>
                        <input
                          type="date"
                          className="w-full px-3 py-1.5 border border-pink-300 rounded-xl outline-none bg-pink-100/50 font-bold text-pink-900"
                          value={newPatient.dpa}
                          onChange={e => setNewPatient({ ...newPatient, dpa: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 4: Accompagnant enrichi */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" /> 4. Patient Accompagné ?
                  </label>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={newPatient.is_accompanied}
                    onChange={e => setNewPatient({ ...newPatient, is_accompanied: e.target.checked })}
                  />
                </div>

                {newPatient.is_accompanied && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
                    <Input
                      label="Prénom Accompagnant"
                      value={newPatient.accompanier_first_name}
                      onChange={e => setNewPatient({ ...newPatient, accompanier_first_name: e.target.value })}
                    />
                    <Input
                      label="Nom Accompagnant"
                      value={newPatient.accompanier_last_name}
                      onChange={e => setNewPatient({ ...newPatient, accompanier_last_name: e.target.value })}
                    />
                    <Input
                      label="Téléphone Accompagnant"
                      value={newPatient.accompanier_phone}
                      onChange={e => setNewPatient({ ...newPatient, accompanier_phone: e.target.value })}
                    />
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Lien / Relation *</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-semibold text-slate-800"
                        value={newPatient.accompanier_relationship}
                        onChange={e => setNewPatient({ ...newPatient, accompanier_relationship: e.target.value })}
                      >
                        {RELATION_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowNewPatientForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Enregistrer Patient & Synchroniser
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Formulaire Nouveau Rendez-vous */}
      {showAppointmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-200" />
                <h2 className="font-bold text-lg">Nouveau Rendez-vous</h2>
              </div>
              <button onClick={() => setShowAppointmentForm(false)} className="p-1 text-white hover:bg-white/10 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewAppointmentSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Sélectionner le Patient *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 font-semibold"
                  value={newAppointment.patient_id}
                  onChange={e => setNewAppointment({ ...newAppointment, patient_id: e.target.value })}
                >
                  <option value="">-- Choisir un patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name || p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Professionnel de santé concerné *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 font-semibold"
                  value={newAppointment.doctor_id}
                  onChange={e => {
                    const doc = doctorsList.find(d => d.id === e.target.value);
                    setNewAppointment({
                      ...newAppointment,
                      doctor_id: e.target.value,
                      doctor_name: doc ? doc.name : e.target.value,
                    });
                  }}
                >
                  <option value="">-- Choisir un médecin --</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.role === 'gynecologue' ? 'Gynécologue' : 'Médecin'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Date & Heure du RDV *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                    value={newAppointment.appointment_date}
                    onChange={e => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Priorité</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                    value={newAppointment.priority}
                    onChange={e => setNewAppointment({ ...newAppointment, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">🚨 Urgence</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  placeholder="Remarques pour la consultation..."
                  value={newAppointment.notes}
                  onChange={e => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowAppointmentForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Planifier le Rendez-vous
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Profile Modal */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  );
}
