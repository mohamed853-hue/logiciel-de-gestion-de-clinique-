import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { PrescriptionForm } from '../components/PrescriptionForm';
import { LabRequestForm } from '../components/LabRequestForm';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  Heart, 
  Baby, 
  Eye, 
  Pill,
  FlaskConical,
  RefreshCw,
  Sparkles,
  FileText,
  Calendar
} from 'lucide-react';
import { AppointmentModal } from '../components/AppointmentModal';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../services/supabase';
import type { Patient, GynGrossesse } from '../types';

type TabType = 'overview' | 'patients' | 'pregnancy' | 'lab';

export function GynecologistDashboard() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [grossesses, setGrossesses] = useState<GynGrossesse[]>([]);
  const [loadingGrossesses, setLoadingGrossesses] = useState(true);

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<Patient | null>(null);
  const [labPatient, setLabPatient] = useState<Patient | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const { patients, loading: loadingPatients, reload: reloadPatients } = usePatients({ limit: 100 });
  const { prescriptions, reload: reloadPrescriptions } = usePrescriptions({ limit: 50 });
  const { labTests, reload: reloadLabs } = useLabRequests({ limit: 50 });

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'pregnancies' || path === '/dashboard/pregnancies') setActiveTab('pregnancy');
      else if (path === 'labs' || path === '/dashboard/labs') setActiveTab('lab');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  useEffect(() => {
    loadGrossesses();
  }, []);

  const loadGrossesses = async () => {
    setLoadingGrossesses(true);
    try {
      const { data, error } = await supabase
        .from('gyn_grossesses')
        .select('*, patient:patients(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGrossesses(data || []);
    } catch (e) {
      console.error('Error loading grossesses:', e);
    } finally {
      setLoadingGrossesses(false);
    }
  };

  const femalePatients = useMemo(() => patients.filter(p => p.sex === 'F'), [patients]);

  // Toutes les patientes enceintes enregistrées à la réception ou en suivi
  const pregnantPatientsFromBase = useMemo(() => {
    return patients.filter(p =>
      (p.sex === 'F' || !p.sex) &&
      (p.is_pregnant ||
       p.pregnancy_months ||
       p.pregnancy_weeks ||
       p.visit_reason?.toLowerCase().includes('grossesse') ||
       p.visit_reason?.toLowerCase().includes('cpn') ||
       p.visit_reason?.toLowerCase().includes('maternite') ||
       p.case_description?.toLowerCase().includes('enceinte'))
    );
  }, [patients]);

  const filteredPatients = femalePatients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const stats = [
    {
      title: isArabic ? 'الحوامل قيد المتابعة' : 'Patientes Enceintes',
      value: Math.max(grossesses.length, pregnantPatientsFromBase.length).toString(),
      sub: isArabic ? 'متابعة CPN والأمومة' : 'Suivies en CPN & Maternité',
      icon: <Baby className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-500',
    },
    {
      title: isArabic ? 'النساء المسجلات' : 'Patientes Féminines',
      value: femalePatients.length.toString(),
      sub: isArabic ? 'مسجلات في النظام' : 'Enregistrées en système',
      icon: <Heart className="w-6 h-6" />,
      color: 'from-red-500 to-pink-500',
    },
    {
      title: isArabic ? 'التحاليل المطلوبة' : 'Analyses Demandées',
      value: labTests.length.toString(),
      sub: isArabic ? 'فحوصات مخبرية' : 'Examens de laboratoire',
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'from-purple-500 to-violet-500',
    },
    {
      title: isArabic ? 'الوصفات الصادرة' : 'Ordonnances Rédigées',
      value: prescriptions.length.toString(),
      sub: isArabic ? 'وصفات محررة' : 'Prescriptions émises',
      icon: <FileText className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {isArabic ? 'قسم النساء والتوليد والأمومة' : 'Espace Gynécologie & Maternité'} <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isArabic 
              ? `د. ${user?.firstName} ${user?.lastName} — متابعة الحمل والاستشارات النسائية`
              : `Dr. ${user?.firstName} ${user?.lastName} — suivi de grossesse et consultations gynécologiques`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { reloadPatients(); loadGrossesses(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isArabic ? 'تحديث' : 'Actualiser'}
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
            <Calendar className="w-4 h-4 mr-2" />
            {t('btn.schedule_appointment', 'Planifier RDV')}
          </Button>
        </div>
      </div>

      {/* Stats Cards avec animations Motion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.title} className="stat-card-motion border-0 shadow-sm cursor-pointer">
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
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'overview', label: isArabic ? 'نظرة شاملة' : "Vue d'ensemble" },
          { id: 'patients', label: `${isArabic ? 'المريضات' : 'Patientes'} (${femalePatients.length})` },
          { id: 'pregnancy', label: `${isArabic ? 'متابعة الحمل (CPN)' : 'Suivi des Grossesses (CPN)'} (${Math.max(grossesses.length, pregnantPatientsFromBase.length)})` },
          { id: 'lab', label: `${isArabic ? 'الفحوصات والمخبر' : 'Examens & Labo'} (${labTests.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-pink-500 text-pink-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-pink-900">
                <Baby className="w-4 h-4 text-pink-600" /> Suivi de Grossesses Actives (Transmises par Réception)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGrossesses || loadingPatients ? (
                <LoadingState type="list" rows={4} />
              ) : pregnantPatientsFromBase.length === 0 && grossesses.length === 0 ? (
                <EmptyState title="Aucune grossesse en cours" description="Les patientes enregistrées comme enceintes à la réception s'afficheront ici automatiquement." />
              ) : (
                <div className="space-y-3">
                  {pregnantPatientsFromBase.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/70 to-rose-50/70 border border-pink-200 hover:border-pink-300 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs">
                          {p.first_name?.[0]}{p.last_name?.[0] || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {p.first_name} {p.last_name || p.name}
                          </p>
                          <p className="text-xs text-pink-700 font-medium">
                            Enceinte | Tél: {p.phone} | N° #{p.patient_number || 'P-000'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setPrescriptionPatient(p); }}>
                          <Pill className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setLabPatient(p); }}>
                          <FlaskConical className="w-4 h-4 text-purple-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> File des Patientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <LoadingState type="list" rows={4} />
              ) : femalePatients.length === 0 ? (
                <EmptyState title="Aucune patiente" />
              ) : (
                <div className="space-y-3">
                  {femalePatients.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.first_name} {p.last_name || p.name}</p>
                        <p className="text-slate-400">{p.visit_reason || 'Consultation'}</p>
                      </div>
                      <StatusBadge status={p.arrival_status || 'stable'} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PATIENTS */}
      {activeTab === 'patients' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Patientes de la Clinique</CardTitle>
              <input
                className="px-3 py-1.5 text-xs border rounded-xl w-56"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2 px-2">Nom</th>
                    <th className="text-left py-2 px-2">Tél</th>
                    <th className="text-center py-2 px-2">État</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-bold">{p.first_name} {p.last_name || p.name}</td>
                      <td className="py-2.5 px-2 font-mono">{p.phone}</td>
                      <td className="py-2.5 px-2 text-center"><StatusBadge status={p.arrival_status || 'stable'} /></td>
                      <td className="py-2.5 px-2 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(p.id)}><Eye className="w-3.5 h-3.5 mr-1" /> Dossier</Button>
                        <Button size="sm" variant="outline" onClick={() => setPrescriptionPatient(p)}><Pill className="w-3.5 h-3.5 mr-1 text-blue-600" /> Ordo</Button>
                        <Button size="sm" variant="outline" onClick={() => setLabPatient(p)}><FlaskConical className="w-3.5 h-3.5 mr-1 text-purple-600" /> Labo</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PREGNANCY */}
      {activeTab === 'pregnancy' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-pink-900">
              <Baby className="w-4 h-4 text-pink-600" /> Registre des Grossesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pregnantPatientsFromBase.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-pink-200 bg-pink-50/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">
                      {p.first_name} {p.last_name || p.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold">
                      Enceinte (Active)
                    </span>
                  </div>
                  <p className="text-slate-600">Tél: {p.phone} | N° Patient: #{p.patient_number || 'P-000'}</p>
                </div>
              ))}
              {pregnantPatientsFromBase.length === 0 && <EmptyState title="Aucune grossesse répertoriée" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onNewPrescription={(p) => { setSelectedPatientId(null); setPrescriptionPatient(p); }}
          onNewLabRequest={(p) => { setSelectedPatientId(null); setLabPatient(p); }}
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

      {showAppointmentModal && (
        <AppointmentModal
          onClose={() => setShowAppointmentModal(false)}
        />
      )}
    </div>
  );
}
