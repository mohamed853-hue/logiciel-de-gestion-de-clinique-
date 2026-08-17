import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { PrescriptionForm } from '../components/PrescriptionForm';
import { LabRequestForm } from '../components/LabRequestForm';
import { AppointmentModal } from '../components/AppointmentModal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  Users, 
  FlaskConical, 
  FileText, 
  AlertCircle, 
  Search, 
  Stethoscope, 
  Eye, 
  Pill,
  RefreshCw,
  Calendar,
  LayoutDashboard,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Activity,
  Edit3,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../services/supabase';
import type { Patient, Appointment } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

type TabType = 'overview' | 'patients' | 'appointments' | 'lab' | 'prescriptions';


const ARRIVAL_LABELS: Record<string, string> = {
  stable: 'Stable',
  urgent: 'Urgent',
  grave: 'Grave',
  critique: 'Critique',
  stable_deco: 'Désorienté',
};

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#dc2626', '#6366f1'];

export function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<Patient | null>(null);
  const [labPatient, setLabPatient] = useState<Patient | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Rendez-vous
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Custom Hooks
  const { patients, loading: loadingPatients, reload: reloadPatients } = usePatients({ limit: 100 });
  const { prescriptions, loading: loadingPrescriptions, reload: reloadPrescriptions } = usePrescriptions({ limit: 50 });
  const { labTests, loading: loadingLabs, reload: reloadLabs } = useLabRequests({ limit: 50 });

  const loadAppointments = async () => {
    setLoadingAppts(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .limit(100);
      setAppointments(data || []);
    } catch { /* silent */ } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Écouteur de navigation globale via sidebar
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'lab' || path === 'labs' || path === '/dashboard/labs') setActiveTab('lab');
      else if (path === 'prescriptions' || path === '/dashboard/prescriptions') setActiveTab('prescriptions');
      else if (path === 'appointments') setActiveTab('appointments');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const reloadAll = () => {
    reloadPatients();
    reloadPrescriptions();
    reloadLabs();
    loadAppointments();
  };

  const filteredPatients = patients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const urgentPatients = patients.filter(p => ['urgent', 'grave', 'critique'].includes(p.arrival_status || ''));
  const pendingLabsCount = labTests.filter(l => l.status === 'en_attente').length;
  const todayAppts = appointments.filter(a => {
    const d = new Date(a.appointment_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // Stats pour graphiques
  const arrivalStats = Object.entries(
    patients.reduce((acc: Record<string, number>, p) => {
      const s = p.arrival_status || 'stable';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: ARRIVAL_LABELS[name] || name, value }));

  const labStatusStats = [
    { name: 'En attente', value: labTests.filter(l => l.status === 'en_attente').length, color: '#f59e0b' },
    { name: 'Terminée', value: labTests.filter(l => ['terminee', 'termine'].includes(l.status as string)).length, color: '#10b981' },
    { name: 'En cours', value: labTests.filter(l => l.status === 'en_cours').length, color: '#6366f1' },
  ].filter(s => s.value > 0);

  const handleUpdateApptStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    loadAppointments();
  };

  const stats = [
    {
      title: 'Patients en Consultation',
      value: patients.length.toString(),
      sub: `${urgentPatients.length} cas urgents`,
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      onClick: () => setActiveTab('patients'),
    },
    {
      title: 'RDV Aujourd\'hui',
      value: todayAppts.length.toString(),
      sub: `${appointments.filter(a => a.status === 'planifie').length} planifié(s)`,
      icon: <Calendar className="w-6 h-6" />,
      color: 'from-violet-500 to-purple-500',
      onClick: () => setActiveTab('appointments'),
    },
    {
      title: 'Analyses en attente',
      value: pendingLabsCount.toString(),
      sub: `${labTests.length} total envoyées`,
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      onClick: () => setActiveTab('lab'),
    },
    {
      title: 'Ordonnances',
      value: prescriptions.length.toString(),
      sub: `${prescriptions.filter(p => p.status === 'delivree').length} délivrées`,
      icon: <FileText className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
      onClick: () => setActiveTab('prescriptions'),
    },
  ];

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: t('doctor.tab.overview', 'Tableau de Bord'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'patients', label: t('doctor.tab.patients', 'File des Patients'), icon: <Stethoscope className="w-4 h-4" />, count: patients.length },
    { id: 'appointments', label: t('doctor.tab.appointments', 'Rendez-vous'), icon: <Calendar className="w-4 h-4" />, count: todayAppts.length },
    { id: 'lab', label: t('doctor.tab.labs', 'Analyses & Résultats'), icon: <FlaskConical className="w-4 h-4" />, count: labTests.length },
    { id: 'prescriptions', label: t('doctor.tab.prescriptions', 'Ordonnances'), icon: <FileText className="w-4 h-4" />, count: prescriptions.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Espace Médecin</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Dr. {user?.firstName} {user?.lastName} — consultations et dossiers médicaux
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reloadAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
            <Calendar className="w-4 h-4 mr-2" />
            Planifier RDV
          </Button>
          {patients.length > 0 && (
            <Button onClick={() => setPrescriptionPatient(patients[0])}>
              <Pill className="w-4 h-4 mr-2" />
              Rédiger Ordonnance
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="stat-card-motion border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={stat.onClick}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW — TABLEAU DE BORD ENRICHI                */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Graphique des états d'arrivée */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Répartition des États d'Arrivée
                </CardTitle>
              </CardHeader>
              <CardContent>
                {arrivalStats.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Aucun patient</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={arrivalStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {arrivalStats.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Statut des analyses labo */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-600" /> Statut des Analyses Labo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {labStatusStats.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Aucune analyse</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={labStatusStats} cx="50%" cy="50%" outerRadius={75} dataKey="value" label>
                        {labStatusStats.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Patients urgents */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" /> Cas Urgents & Graves
                  </CardTitle>
                  {urgentPatients.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full animate-pulse">
                      {urgentPatients.length} cas
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {urgentPatients.length === 0 ? (
                  <EmptyState title="Aucun cas urgent" description="Tous les patients sont stables." />
                ) : (
                  <div className="space-y-2">
                    {urgentPatients.slice(0, 5).map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {patient.first_name} {patient.last_name || patient.name}
                          </p>
                          <p className="text-xs text-slate-500">{patient.visit_reason || 'Consultation'}</p>
                        </div>
                        <StatusBadge status={patient.arrival_status || 'stable'} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suivi labo récents */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-600" /> Analyses Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLabs ? (
                  <LoadingState type="list" rows={4} />
                ) : labTests.length === 0 ? (
                  <EmptyState title="Aucune analyse" />
                ) : (
                  <div className="space-y-2">
                    {labTests.slice(0, 5).map((lab) => (
                      <div key={lab.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{lab.test_name}</p>
                          {lab.results_text && (
                            <p className="text-emerald-700 font-mono mt-0.5 text-[10px]">Résultat: {lab.results_text}</p>
                          )}
                        </div>
                        <StatusBadge status={lab.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: PATIENTS / CONSULTATIONS                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'patients' && (
        <div className="space-y-5">
          {/* Mini graphique compact */}
          {arrivalStats.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Répartition patients</p>
                    <div className="flex gap-3">
                      {arrivalStats.map((s, idx) => (
                        <div key={s.name} className="text-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}>
                            {s.value}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{s.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-xs text-slate-500">
                    <span className="text-2xl font-black text-slate-800">{patients.length}</span> patients total
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" /> Liste des Patients en Consultation
                </CardTitle>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    placeholder="Rechercher patient..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <LoadingState type="table" rows={6} />
              ) : filteredPatients.length === 0 ? (
                <EmptyState type="search" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                        <th className="text-left py-3 px-3">Patient</th>
                        <th className="text-left py-3 px-3">Motif</th>
                        <th className="text-left py-3 px-3">Téléphone</th>
                        <th className="text-center py-3 px-3">État</th>
                        <th className="text-right py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map(patient => (
                        <tr key={patient.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {patient.first_name} {patient.last_name || patient.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{patient.visit_reason || 'Consultation'}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-xs">{patient.phone}</td>
                          <td className="py-3 px-3 text-center">
                            <StatusBadge status={patient.arrival_status || 'stable'} />
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(patient.id)}>
                              <Eye className="w-4 h-4 mr-1" /> Dossier
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setPrescriptionPatient(patient)}>
                              <Pill className="w-4 h-4 mr-1 text-blue-600" /> Ordonnance
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setLabPatient(patient)}>
                              <FlaskConical className="w-4 h-4 mr-1 text-purple-600" /> Labo
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: APPOINTMENTS — GESTION DES RENDEZ-VOUS            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'appointments' && (
        <div className="space-y-5">
          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: appointments.length, color: 'bg-slate-100 text-slate-700' },
              { label: 'Planifiés', value: appointments.filter(a => a.status === 'planifie').length, color: 'bg-blue-100 text-blue-700' },
              { label: 'Confirmés', value: appointments.filter(a => a.status === 'confirme').length, color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Aujourd\'hui', value: todayAppts.length, color: 'bg-violet-100 text-violet-700' },
            ].map(s => (
              <div key={s.label} className={cn('p-3 rounded-xl text-center', s.color)}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-600" /> Tous les Rendez-vous
                </CardTitle>
                <Button size="sm" onClick={() => setShowAppointmentModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Nouveau RDV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAppts ? (
                <LoadingState type="list" rows={5} />
              ) : appointments.length === 0 ? (
                <EmptyState title="Aucun rendez-vous" description="Les rendez-vous planifiés par la réception apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {appointments.map(a => (
                    <div key={a.id} className={cn(
                      'p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 text-xs',
                      a.priority === 'urgent' ? 'bg-amber-50 border-amber-200' :
                      a.priority === 'emergency' ? 'bg-red-50 border-red-200' :
                      'bg-slate-50 border-slate-200'
                    )}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{a.patient_name || 'Patient'}</p>
                          {a.priority === 'urgent' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">URGENT</span>}
                          {a.priority === 'emergency' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold animate-pulse">🚨 URGENCE</span>}
                        </div>
                        <p className="text-slate-500 mt-0.5">Médecin : <strong className="text-slate-700">{a.doctor_name}</strong></p>
                        <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(a.appointment_date).toLocaleString('fr-FR')}
                        </p>
                        {a.notes && <p className="text-slate-400 mt-0.5 italic">Note : {a.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <Button size="sm" variant="ghost" onClick={() => setEditingAppointment(a)}>
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Modifier
                        </Button>
                        {a.status === 'planifie' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateApptStatus(a.id, 'confirme')}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmer
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateApptStatus(a.id, 'annule')}
                              className="text-red-600 border-red-200 hover:bg-red-50">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Annuler
                            </Button>
                          </>
                        )}
                        {a.status === 'confirme' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateApptStatus(a.id, 'termine')}
                            className="text-blue-700 border-blue-200 hover:bg-blue-50">
                            <ChevronRight className="w-3.5 h-3.5 mr-1" /> Effectué
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: LAB */}
      {activeTab === 'lab' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demandes et Résultats d'Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLabs ? (
              <LoadingState type="table" rows={6} />
            ) : labTests.length === 0 ? (
              <EmptyState title="Aucune analyse" />
            ) : (
              <div className="space-y-3">
                {labTests.map(lab => (
                  <div key={lab.id} className="p-4 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{lab.test_name}</p>
                      <p className="text-slate-500">Demandé par : {lab.requested_by}</p>
                      {lab.results_text && (
                        <p className="mt-2 text-emerald-800 bg-emerald-50 p-2 rounded-lg font-mono">
                          <strong>Résultat :</strong> {lab.results_text}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={lab.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ordonnances Rédigées</CardTitle>
              {patients.length > 0 && (
                <Button size="sm" onClick={() => setPrescriptionPatient(patients[0])}>
                  <Pill className="w-4 h-4 mr-1" /> Nouvelle Ordonnance
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingPrescriptions ? (
              <LoadingState type="table" rows={6} />
            ) : prescriptions.length === 0 ? (
              <EmptyState title="Aucune ordonnance" />
            ) : (
              <div className="space-y-4">
                {prescriptions.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex justify-between items-center border-b pb-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{p.doctor_name}</span>
                        <span className="text-slate-400 ml-2">{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="space-y-1">
                      {p.items?.map((item, idx) => (
                        <div key={idx} className="text-xs bg-slate-50 p-2 rounded-lg flex justify-between">
                          <span className="font-semibold text-slate-700">{item.medicament} ({item.dosage})</span>
                          <span className="text-slate-500">{item.frequence} - {item.duree}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onNewPrescription={(p) => { setPrescriptionPatient(p); }}
          onNewLabRequest={(p) => { setLabPatient(p); }}
        />
      )}

      {prescriptionPatient && (
        <PrescriptionForm
          patient={prescriptionPatient}
          onClose={() => setPrescriptionPatient(null)}
          onSuccess={() => reloadPrescriptions()}
        />
      )}

      {labPatient && (
        <LabRequestForm
          patient={labPatient}
          onClose={() => setLabPatient(null)}
          onSuccess={() => reloadLabs()}
        />
      )}

      {(showAppointmentModal || editingAppointment) && (
        <AppointmentModal
          appointmentToEdit={editingAppointment}
          onClose={() => { setShowAppointmentModal(false); setEditingAppointment(null); }}
          onSuccess={() => loadAppointments()}
        />
      )}
    </div>
  );
}
