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
  Baby, 
  Eye, 
  Pill, 
  FlaskConical, 
  RefreshCw, 
  Sparkles, 
  Calendar, 
  Clock, 
  Plus, 
  Printer, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  ChevronRight, 
  Users, 
  Activity, 
  Award 
} from 'lucide-react';
import { AppointmentModal } from '../components/AppointmentModal';
import { NewBirthModal } from '../components/NewBirthModal';
import { NewbornDossierModal } from '../components/NewbornDossierModal';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../services/supabase';
import type { Patient, GynAccouchement, Appointment } from '../types';

type TabType = 'overview' | 'patients' | 'calendar' | 'births' | 'appointments' | 'labs';

export function GynecologistDashboard() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [births, setBirths] = useState<GynAccouchement[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingBirths, setLoadingBirths] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<Patient | null>(null);
  const [labPatient, setLabPatient] = useState<Patient | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showNewBirthModal, setShowNewBirthModal] = useState(false);
  const [selectedBirthRecord, setSelectedBirthRecord] = useState<GynAccouchement | null>(null);

  const { patients, loading: loadingPatients, reload: reloadPatients } = usePatients({ limit: 150 });
  const { reload: reloadPrescriptions } = usePrescriptions({ limit: 50 });
  const { labTests, loading: loadingLabs, reload: reloadLabs } = useLabRequests({ limit: 100 });

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'pregnancies' || path === '/dashboard/pregnancies') setActiveTab('calendar');
      else if (path === 'labs' || path === '/dashboard/labs') setActiveTab('labs');
      else if (path === 'appointments') setActiveTab('appointments');
      else if (path === 'births') setActiveTab('births');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadBirths = async () => {
    setLoadingBirths(true);
    try {
      const { data, error } = await supabase
        .from('gyn_accouchements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        setBirths(data);
        localStorage.setItem('al_shifa_births', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('al_shifa_births');
        if (cached) setBirths(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem('al_shifa_births');
      if (cached) setBirths(JSON.parse(cached));
    } finally {
      setLoadingBirths(false);
    }
  };

  const loadAppointments = async () => {
    setLoadingAppts(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .limit(100);
      if (!error && data) {
        setAppointments(data);
      }
    } catch { /* silent */ } finally {
      setLoadingAppts(false);
    }
  };

  const loadAllData = () => {
    reloadPatients();
    loadBirths();
    loadAppointments();
    reloadLabs();
    reloadPrescriptions();
  };

  const femalePatients = useMemo(() => patients.filter(p => p.sex === 'F' || !p.sex), [patients]);

  // Patientes enceintes actives (détectées depuis patients ou grossesses)
  const pregnantPatients = useMemo(() => {
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

  // ─── CALCUL DU CALENDRIER PRÉVISIONNEL DES ACCOUCHEMENTS ─────────────────────
  const pregnancyCalendar = useMemo(() => {
    const today = new Date();
    const imminentList: Array<{ patient: Patient; dpaDate: Date; weeksSa: number; status: 'imminent' | 'this_week' | 'this_month' | 'future' }> = [];
    const thisMonthList: typeof imminentList = [];
    const futureList: typeof imminentList = [];

    pregnantPatients.forEach(p => {
      let dpaDate: Date | null = null;
      let weeksSa = parseInt(p.pregnancy_weeks || '0') || 0;

      if (p.dpa) {
        dpaDate = new Date(p.dpa);
      } else if (p.ddr) {
        // DPA = DDR + 9 mois + 7 jours
        const ddrDate = new Date(p.ddr);
        dpaDate = new Date(ddrDate);
        dpaDate.setMonth(dpaDate.getMonth() + 9);
        dpaDate.setDate(dpaDate.getDate() + 7);
      } else if (weeksSa > 0) {
        // Estimer DPA à 41 SA
        const remainingWeeks = Math.max(0, 41 - weeksSa);
        dpaDate = new Date(today);
        dpaDate.setDate(dpaDate.getDate() + remainingWeeks * 7);
      } else {
        // Estimation par défaut 3 mois
        dpaDate = new Date(today);
        dpaDate.setMonth(dpaDate.getMonth() + 3);
      }

      const diffDays = Math.ceil((dpaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        imminentList.push({ patient: p, dpaDate, weeksSa, status: 'imminent' });
      } else if (diffDays <= 30) {
        thisMonthList.push({ patient: p, dpaDate, weeksSa, status: 'this_week' });
      } else {
        futureList.push({ patient: p, dpaDate, weeksSa, status: 'future' });
      }
    });

    return {
      imminent: imminentList.sort((a, b) => a.dpaDate.getTime() - b.dpaDate.getTime()),
      thisMonth: thisMonthList.sort((a, b) => a.dpaDate.getTime() - b.dpaDate.getTime()),
      future: futureList.sort((a, b) => a.dpaDate.getTime() - b.dpaDate.getTime()),
      total: imminentList.length + thisMonthList.length + futureList.length,
    };
  }, [pregnantPatients]);

  const handleUpdateApptStatus = async (id: string, status: string) => {
    try {
      await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
    } catch { /* silent */ }
  };

  const filteredPatients = femalePatients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const stats = [
    {
      title: isArabic ? 'الحوامل قيد المتابعة' : 'Patientes Enceintes',
      value: pregnantPatients.length.toString(),
      sub: isArabic ? `${pregnancyCalendar.imminent.length} ولادة متوقعة قريباً` : `${pregnancyCalendar.imminent.length} accouchement(s) imminents`,
      icon: <Baby className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-500',
      onClick: () => setActiveTab('calendar'),
    },
    {
      title: isArabic ? 'إجمالي الأطفال المولودين' : 'Nouveau-nés Enregistrés',
      value: births.length.toString(),
      sub: isArabic ? `${births.filter(b => b.sexe_bebe === 'M').length} ذكور · ${births.filter(b => b.sexe_bebe === 'F').length} إناث` : `${births.filter(b => b.sexe_bebe === 'M').length} 👦 · ${births.filter(b => b.sexe_bebe === 'F').length} 👧`,
      icon: <Award className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
      onClick: () => setActiveTab('births'),
    },
    {
      title: isArabic ? 'مواعيد التوليد' : 'Rendez-vous CPN & Gynéco',
      value: appointments.length.toString(),
      sub: isArabic ? `${appointments.filter(a => a.status === 'planifie').length} مجدول` : `${appointments.filter(a => a.status === 'planifie').length} à venir`,
      icon: <Calendar className="w-6 h-6" />,
      color: 'from-purple-500 to-violet-500',
      onClick: () => setActiveTab('appointments'),
    },
    {
      title: isArabic ? 'التحاليل والفحوصات' : 'Examens & Échographies',
      value: labTests.length.toString(),
      sub: isArabic ? 'تحاليل ونتائج واردة' : 'Bilans prénataux & échos',
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      onClick: () => setActiveTab('labs'),
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
              ? `د. ${user?.firstName} ${user?.lastName} — متابعة الحمل، الولادات والفحوصات`
              : `Dr. ${user?.firstName} ${user?.lastName} — suivi de grossesse, naissances et consultations`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={loadAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isArabic ? 'تحديث' : 'Actualiser'}
          </Button>
          <Button onClick={() => setShowNewBirthModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            <Baby className="w-4 h-4 mr-2" />
            {isArabic ? '+ تسجيل ولادة جديدة' : '+ Enregistrer une Naissance'}
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
            <Calendar className="w-4 h-4 mr-2" />
            {t('btn.schedule_appointment', '+ Planifier RDV')}
          </Button>
        </div>
      </div>

      {/* Stats Cards avec animations Motion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.title} className="stat-card-motion border-0 shadow-sm cursor-pointer" onClick={stat.onClick}>
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

      {/* ─── BARRE D'ONGLETS DE GYNÉCOLOGIE & MATERNITÉ ─────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: isArabic ? 'نظرة شاملة' : "Vue d'ensemble", icon: <Activity className="w-4 h-4" /> },
          { id: 'calendar', label: `${isArabic ? 'تقويم الولادات المتوقعة' : 'Calendrier Accouchements'} (${pregnancyCalendar.total})`, icon: <Clock className="w-4 h-4 text-pink-600" /> },
          { id: 'births', label: `${isArabic ? 'الأطفال والمواليد' : 'Naissances & Bébés'} (${births.length})`, icon: <Baby className="w-4 h-4 text-rose-600" /> },
          { id: 'patients', label: `${isArabic ? 'المريضات' : 'Patientes'} (${femalePatients.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'appointments', label: `${isArabic ? 'المواعيد' : 'Rendez-vous'} (${appointments.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'labs', label: `${isArabic ? 'التحاليل والنتائج' : 'Examens & Labo'} (${labTests.length})`, icon: <FlaskConical className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-3 font-bold text-xs sm:text-sm transition-all border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded-t-xl',
              activeTab === tab.id
                ? 'border-pink-500 text-pink-600 bg-pink-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 1 : VUE D'ENSEMBLE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Bannière alerte accouchements imminents */}
          {pregnancyCalendar.imminent.length > 0 && (
            <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 p-4 rounded-3xl text-white shadow-md flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
                  🚨
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    {isArabic ? `${pregnancyCalendar.imminent.length} ولادة متوقعة خلال هذا الأسبوع (أجل قريب)` : `${pregnancyCalendar.imminent.length} Accouchement(s) prévu(s) cette semaine !`}
                  </h3>
                  <p className="text-xs text-pink-100 mt-0.5">
                    {isArabic ? 'يرجى مراجعة تجهيزات جناح الولادة وملفات الأمهات' : 'Préparez la salle de naissance et les dossiers de suivi obstétrical.'}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab('calendar')} className="bg-white text-rose-800 hover:bg-rose-50 font-bold text-xs">
                {isArabic ? 'عرض جدول الولادات' : 'Voir le Calendrier Prévisionnel'}
              </Button>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Suivi des grossesses en cours */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-pink-900">
                    <Baby className="w-4 h-4 text-pink-600" /> {isArabic ? 'الحوامل قيد المتابعة الدورية' : 'Grossesses Actives en Suivi CPN'}
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('calendar')} className="text-xs text-pink-700">
                    {isArabic ? 'عرض الكل' : 'Voir tout'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPatients ? (
                  <LoadingState type="list" rows={4} />
                ) : pregnantPatients.length === 0 ? (
                  <EmptyState title={isArabic ? 'لا توجد حوامل مسجلات حالياً' : 'Aucune grossesse en cours'} description={isArabic ? 'ستظهر الحوامل المسجلات في الاستقبال هنا تلقائياً' : 'Les patientes déclarées enceintes à l\'accueil apparaîtront ici.'} />
                ) : (
                  <div className="space-y-3">
                    {pregnantPatients.slice(0, 5).map((p) => (
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
                              {p.pregnancy_months ? `${p.pregnancy_months} mois` : (p.pregnancy_weeks ? `${p.pregnancy_weeks} SA` : 'Enceinte')} · Tél: {p.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="Prescription" onClick={(e) => { e.stopPropagation(); setPrescriptionPatient(p); }}>
                            <Pill className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Analyses" onClick={(e) => { e.stopPropagation(); setLabPatient(p); }}>
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dernières naissances enregistrées */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-rose-900">
                    <Award className="w-4 h-4 text-rose-600" /> {isArabic ? 'آخر المواليد والولادات المسجلة' : 'Dernières Naissances Enregistrées'}
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowNewBirthModal(true)} className="bg-rose-600 hover:bg-rose-700 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> {isArabic ? '+ ولادة' : '+ Naissance'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBirths ? (
                  <LoadingState type="list" rows={4} />
                ) : births.length === 0 ? (
                  <EmptyState title={isArabic ? 'لم تسجل أي ولادة بعد' : 'Aucune naissance enregistrée'} description={isArabic ? 'انقر على زر تسجيل ولادة جديدة لإضافة مولود' : 'Enregistrez les accouchements pour constituer le registre de maternité.'} />
                ) : (
                  <div className="space-y-3">
                    {births.slice(0, 5).map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBirthRecord(b)}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-pink-50/50 hover:border-pink-200 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center text-lg font-bold">
                            {b.sexe_bebe === 'M' ? '👶🏻' : '👶🏽'}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs sm:text-sm">
                              {b.prenom_bebe || 'Bébé'} {b.nom_bebe || b.mother_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {isArabic ? 'الأم :' : 'Mère :'} {b.mother_name || 'Patiente'} · {b.date_naissance ? new Date(b.date_naissance).toLocaleDateString('fr-FR') : '--'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            ⚖️ {b.poids_bebe_grammes ? `${(b.poids_bebe_grammes / (b.poids_bebe_grammes > 100 ? 1000 : 1)).toFixed(2)} kg` : '--'}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 capitalize">{b.type_accouchement?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 2 : CALENDRIER PRÉVISIONNEL DES TERMES & ACCOUCHEMENTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5 rounded-3xl border border-pink-200 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-base font-black text-pink-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                {isArabic ? 'التقويم التنبؤي لتواريخ الولادة واستقبال الأمهات' : 'Calendrier Prévisionnel des Termes & Accouchements'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {isArabic 
                  ? 'حساب آلي للمواعيد المتوقعة للوضع (DPA) ومتابعة النساء اللاتي على وشك الولادة'
                  : 'Estimation automatique de la Date Prévue d\'Accouchement (DPA) et suivi des termes imminents.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowNewBirthModal(true)} className="bg-rose-600 hover:bg-rose-700 text-xs">
                <Baby className="w-3.5 h-3.5 mr-1" /> {isArabic ? '+ تسجيل ولادة تمت' : '+ Déclarer un Accouchement'}
              </Button>
            </div>
          </div>

          {/* 1. TERMES IMMINENTS (CETTE SEMAINE) */}
          <Card className="border-0 shadow-sm border-l-4 border-l-rose-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-rose-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  {isArabic ? `1. ولادات متوقعة هذا الأسبوع / في غضون 7 أيام (${pregnancyCalendar.imminent.length})` : `1. Accouchements Attendus Cette Semaine / Terme Imminent (${pregnancyCalendar.imminent.length})`}
                </CardTitle>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                  ⚠️ {isArabic ? 'مراقبة لصيقة' : 'Priorité Haute'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {pregnancyCalendar.imminent.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">{isArabic ? 'لا توجد ولادات وشيكة خلال الأيام السبعة القادمة.' : 'Aucun terme prévu dans les 7 prochains jours.'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pregnancyCalendar.imminent.map(item => (
                    <div key={item.patient.id} className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{item.patient.first_name} {item.patient.last_name || item.patient.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">Tél: {item.patient.phone}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px]">
                          {isArabic ? 'هذا الأسبوع' : 'Imminent'}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-xl text-xs flex justify-between items-center">
                        <span className="text-slate-500">{isArabic ? 'تاريخ الوضع المتوقع :' : 'Terme prévu :'}</span>
                        <strong className="text-rose-700 font-mono font-black">{item.dpaDate.toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</strong>
                      </div>
                      <div className="flex justify-end gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPatientId(item.patient.id)} className="text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'الملف' : 'Dossier'}
                        </Button>
                        <Button size="sm" onClick={() => { setShowNewBirthModal(true); }} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                          <Baby className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'ولادة' : 'Accouchement'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. TERMES CE MOIS-CI */}
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                {isArabic ? `2. ولادات متوقعة خلال هذا الشهر (8 - 30 يوماً) (${pregnancyCalendar.thisMonth.length})` : `2. Accouchements Prévus Ce Mois-ci (8 à 30 jours) (${pregnancyCalendar.thisMonth.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pregnancyCalendar.thisMonth.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">{isArabic ? 'لا توجد ولادات مسجلة خلال هذا الشهر.' : 'Aucun accouchement répertorié pour ce mois.'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pregnancyCalendar.thisMonth.map(item => (
                    <div key={item.patient.id} className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{item.patient.first_name} {item.patient.last_name || item.patient.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">Tél: {item.patient.phone}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[10px]">
                          {isArabic ? 'هذا الشهر' : 'Ce Mois'}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-xl text-xs flex justify-between items-center">
                        <span className="text-slate-500">{isArabic ? 'تاريخ الوضع المتوقع :' : 'Terme prévu :'}</span>
                        <strong className="text-amber-800 font-mono font-bold">{item.dpaDate.toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</strong>
                      </div>
                      <div className="flex justify-end gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPatientId(item.patient.id)} className="text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'الملف الطبي' : 'Dossier'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. TERMES DES MOIS SUIVANTS (T1 / T2) */}
          <Card className="border-0 shadow-sm border-l-4 border-l-pink-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-600" />
                {isArabic ? `3. متابعات ومواعيد الوضع في الأشهر القادمة (${pregnancyCalendar.future.length})` : `3. Termes des Mois Suivants / Trimestre 1 & 2 (${pregnancyCalendar.future.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pregnancyCalendar.future.map(item => (
                  <div key={item.patient.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">{item.patient.first_name} {item.patient.last_name || item.patient.name}</p>
                      <span className="text-[10px] text-pink-600 font-mono font-bold bg-pink-50 px-2 py-0.5 rounded-md">
                        {item.dpaDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isArabic ? 'الترقب :' : 'DPA :'} {item.dpaDate.toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 3 : NAISSANCES & NOUVEAU-NÉS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'births' && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Baby className="w-5 h-5 text-rose-600" />
                    {isArabic ? 'سجل الولادات والملفات الصحية للمواليد' : 'Registre des Naissances & Dossiers Néonatals'}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isArabic ? 'جميع الأطفال حديثي الولادة المرتبطين بملفات أمهاتهم' : 'Tous les enfants nés rattachés au dossier médical de leur mère.'}
                  </p>
                </div>
                <Button onClick={() => setShowNewBirthModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {isArabic ? '+ تسجيل ولادة جديدة' : '+ Déclarer une Naissance'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBirths ? (
                <LoadingState type="table" rows={5} />
              ) : births.length === 0 ? (
                <EmptyState title={isArabic ? 'لا توجد ولادات مسجلة' : 'Aucune naissance dans le registre'} description={isArabic ? 'استخدم زر تسجيل ولادة جديدة لإضافة مولود' : 'Enregistrez les naissances pour constituer les dossiers des nouveau-nés.'} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b">
                      <tr>
                        <th className="p-3">Nouveau-né</th>
                        <th className="p-3">Mère Associée</th>
                        <th className="p-3">Date & Heure</th>
                        <th className="p-3">Poids & Taille</th>
                        <th className="p-3">Accouchement</th>
                        <th className="p-3">APGAR</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {births.map((b) => (
                        <tr key={b.id} className="hover:bg-pink-50/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{b.sexe_bebe === 'M' ? '👶🏻' : '👶🏽'}</span>
                              <div>
                                <p className="font-extrabold text-slate-900">{b.prenom_bebe || 'Bébé'} {b.nom_bebe || ''}</p>
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                  {b.sexe_bebe === 'M' ? (isArabic ? 'ذكر' : 'Garçon') : (isArabic ? 'أنثى' : 'Fille')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{b.mother_name || 'Mère'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{b.mother_phone || '--'}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-800">{b.date_naissance ? new Date(b.date_naissance).toLocaleDateString('fr-FR') : '--'}</p>
                            {b.heure_naissance && <p className="text-[10px] text-slate-400">{b.heure_naissance}</p>}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold font-mono">
                              ⚖️ {b.poids_bebe_grammes ? `${(b.poids_bebe_grammes / (b.poids_bebe_grammes > 100 ? 1000 : 1)).toFixed(2)} kg` : '--'}
                            </span>
                            {b.taille_cm && <p className="text-[10px] text-slate-500 mt-0.5">📏 {b.taille_cm} cm</p>}
                          </td>
                          <td className="p-3 capitalize font-medium text-slate-700">
                            {b.type_accouchement?.replace('_', ' ')}
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                              {b.apgar_1min || 9}/{b.apgar_5min || 10}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => setSelectedBirthRecord(b)} className="text-xs">
                              <Printer className="w-3.5 h-3.5 mr-1 text-pink-600" />
                              {isArabic ? 'شهادة المولود' : 'Fiche Bébé'}
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

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 4 : PATIENTES & DOSSIERS MÉDICAUX
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'patients' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <CardTitle className="text-base">{isArabic ? 'قائمة المريضات المسجلات' : 'Patientes de la Clinique'}</CardTitle>
              <input
                className="px-3 py-1.5 text-xs border rounded-xl w-56"
                placeholder={isArabic ? 'بحث عن مريضة...' : 'Rechercher...'}
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
                    <th className="text-left py-2 px-2">{isArabic ? 'الاسم واللقب' : 'Nom'}</th>
                    <th className="text-left py-2 px-2">{isArabic ? 'الهاتف' : 'Tél'}</th>
                    <th className="text-center py-2 px-2">{isArabic ? 'حالة الحمل' : 'Grossesse'}</th>
                    <th className="text-right py-2 px-2">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-bold">{p.first_name} {p.last_name || p.name}</td>
                      <td className="py-2.5 px-2 font-mono">{p.phone}</td>
                      <td className="py-2.5 px-2 text-center">
                        {p.is_pregnant || p.pregnancy_months ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                            🤰 {p.pregnancy_months ? `${p.pregnancy_months} mois` : 'Enceinte'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(p.id)}><Eye className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'الملف الكامل' : 'Dossier'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setPrescriptionPatient(p)}><Pill className="w-3.5 h-3.5 mr-1 text-blue-600" /> {isArabic ? 'وصفة' : 'Ordo'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setLabPatient(p)}><FlaskConical className="w-3.5 h-3.5 mr-1 text-purple-600" /> {isArabic ? 'تحليل' : 'Labo'}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 5 : RENDEZ-VOUS GYNÉCO & OBSTÉTRIQUE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'appointments' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                {isArabic ? 'جدول المواعيد والاستشارات' : 'Rendez-vous Gynécologie & CPN'}
              </CardTitle>
              <Button size="sm" onClick={() => setShowAppointmentModal(true)} className="bg-pink-600 hover:bg-pink-700">
                <Calendar className="w-3.5 h-3.5 mr-1" /> {isArabic ? '+ موعد جديد' : '+ Nouveau RDV'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAppts ? (
              <LoadingState type="list" rows={4} />
            ) : appointments.length === 0 ? (
              <EmptyState title={isArabic ? 'لا توجد مواعيد مجدولة' : 'Aucun rendez-vous'} description={isArabic ? 'المواعيد المبرمجة من الاستقبال ستظهر هنا فورياً' : 'Les rendez-vous planifiés par l\'accueil s\'afficheront ici automatiquement.'} />
            ) : (
              <div className="space-y-3">
                {appointments.map(a => {
                  const isExpired = new Date(a.appointment_date) < new Date() && a.status !== 'termine' && a.status !== 'annule';
                  return (
                    <div key={a.id} className={cn(
                      'p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 text-xs',
                      isExpired ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    )}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-800 text-sm">{a.patient_name || 'Patiente'}</p>
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              ⚠️ {isArabic ? 'موعد فائت / لم يحضر' : 'Passé / Non honoré'}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-0.5">{isArabic ? 'الطبيب :' : 'Médecin :'} <strong>{a.doctor_name}</strong></p>
                        <p className="text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(a.appointment_date).toLocaleString('fr-FR')}
                        </p>
                        {a.notes && <p className="text-slate-500 italic mt-0.5">{a.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={a.status} />

                        {a.status === 'planifie' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateApptStatus(a.id, 'confirme')} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'تأكيد' : 'Confirmer'}
                          </Button>
                        )}

                        {a.status !== 'termine' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateApptStatus(a.id, 'termine')} className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs">
                            <ChevronRight className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'تم الإنجاز' : 'Effectué'}
                          </Button>
                        )}

                        <Button size="sm" variant="ghost" onClick={() => setEditingAppointment(a)} className="text-xs">
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'تقديم / تأجيل' : 'Avancer/Déplacer'}
                        </Button>

                        {a.status !== 'annule' && (
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateApptStatus(a.id, 'annule')} className="text-rose-600 hover:bg-rose-50 text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> {isArabic ? 'إلغاء' : 'Annuler'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 6 : EXAMENS & LABO GYNÉCOLOGIQUE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'labs' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              {isArabic ? 'التحاليل والفحوصات الطبية والمخبرية' : 'Examens & Résultats de Laboratoire'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLabs ? (
              <LoadingState type="table" rows={6} />
            ) : labTests.length === 0 ? (
              <EmptyState title={isArabic ? 'لا توجد تحاليل واردة' : 'Aucun examen de laboratoire'} />
            ) : (
              <div className="space-y-3">
                {labTests.map(lab => (
                  <div key={lab.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex justify-between items-center flex-wrap gap-3 text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{lab.test_name}</p>
                      <p className="text-slate-500 mt-0.5">{isArabic ? 'طالب الفحص :' : 'Demandé par :'} {lab.requested_by} · {new Date(lab.created_at).toLocaleDateString('fr-FR')}</p>
                      {lab.results_text && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono">
                          <strong>{isArabic ? 'النتيجة المعتمدة :' : 'Résultat :'}</strong> {lab.results_text}
                        </div>
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

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onNewPrescription={(p) => { setSelectedPatientId(null); setPrescriptionPatient(p); }}
          onNewLabRequest={(p) => { setSelectedPatientId(null); setLabPatient(p); }}
        />
      )}

      {selectedBirthRecord && (
        <NewbornDossierModal
          birthRecord={selectedBirthRecord}
          motherPatient={patients.find(p => p.id === selectedBirthRecord.patient_id)}
          onClose={() => setSelectedBirthRecord(null)}
        />
      )}

      {showNewBirthModal && (
        <NewBirthModal
          patientsList={femalePatients}
          onSuccess={() => { loadBirths(); reloadPatients(); }}
          onClose={() => setShowNewBirthModal(false)}
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
