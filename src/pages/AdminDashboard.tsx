import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Shield, 
  Users, 
  Activity, 
  Search, 
  BarChart3, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  CheckCircle, 
  Calendar, 
  UserPlus, 
  Key, 
  DollarSign, 
  AlertTriangle, 
  Stethoscope, 
  Heart, 
  CreditCard, 
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { UserRole, Patient, PatientDiagnostic } from '../types';
import {
  ModalShell,
  FormField,
  ModalInput,
  ModalSelect,
  CancelButton,
  SubmitButton,
} from '../components/ModalShell';
import { AppointmentModal } from '../components/AppointmentModal';
import { useLanguage } from '../hooks/useLanguage';
import { getPatientDiagnostics, updateDiagnosticEvolution } from '../services/pathologyService';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  phone?: string;
  service?: string;
  created_at?: string;
  last_login?: string;
}

type TabType = 'overview' | 'pathologies' | 'demographics' | 'financial' | 'users' | 'activity';
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  medecin: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  gynecologue: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  infirmier: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  laborantin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  receptionniste: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  radiologue: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

export function AdminDashboard() {
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [diagnostics, setDiagnostics] = useState<PatientDiagnostic[]>([]);
  const [carePayments, setCarePayments] = useState<any[]>([]);
  const [pharmacySales, setPharmacySales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pathologySearch, setPathologySearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<AppUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('alshifa123');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'demo123',
    role: 'medecin' as UserRole,
    phone: '',
    service: 'Médecine Générale',
  });
  const [toastMsg, setToastMsg] = useState('');

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'users' || path === '/dashboard/users') setActiveTab('users');
      else if (path === 'pathologies' || path === '/dashboard/pathologies') setActiveTab('pathologies');
      else if (path === 'demographics') setActiveTab('demographics');
      else if (path === 'financial') setActiveTab('financial');
      else if (path === 'activity') setActiveTab('activity');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uRes, pRes, payRes, pharmRes, diagList] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('care_payments').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('pharmacy_sales').select('*').order('created_at', { ascending: false }).limit(200),
        getPatientDiagnostics(),
      ]);

      setUsersList(uRes.data || []);
      setPatients(pRes.data || []);
      setCarePayments(payRes.data || []);
      setPharmacySales(pharmRes.data || []);
      setDiagnostics(diagList || []);
    } catch (e) {
      console.error('Error loading super admin data:', e);
    }
  };

  // ─── FILTRAGE DES DIAGNOSTICS PAR PÉRIODE ────────────────────────────────────
  const filteredDiagnostics = useMemo(() => {
    const now = new Date();
    return diagnostics.filter(d => {
      if (period === 'all') return true;
      const date = new Date(d.created_at);
      if (period === 'today') return date.toDateString() === now.toDateString();
      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return date >= weekAgo;
      }
      if (period === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [diagnostics, period]);

  // ─── STATISTIQUES ÉPIDÉMIOLOGIQUES & PATHOLOGIES ─────────────────────────────
  // Paludisme
  const malariaCases = useMemo(() => diagnostics.filter(d => d.disease_name.toLowerCase().includes('palu') || d.disease_name.toLowerCase().includes('malaria')), [diagnostics]);
  const malariaThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(new Date().getDate() - 7);
    return malariaCases.filter(d => new Date(d.created_at) >= weekAgo).length;
  }, [malariaCases]);
  const malariaThisMonth = useMemo(() => {
    const now = new Date();
    return malariaCases.filter(d => {
      const dDate = new Date(d.created_at);
      return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    }).length;
  }, [malariaCases]);
  const malariaSevere = useMemo(() => malariaCases.filter(d => d.severity === 'grave' || d.severity === 'critique').length, [malariaCases]);

  // Rhume / Grippe
  const coldCases = useMemo(() => diagnostics.filter(d => d.disease_name.toLowerCase().includes('rhume') || d.disease_name.toLowerCase().includes('grippe') || d.disease_name.toLowerCase().includes('rhino')), [diagnostics]);
  const coldThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(new Date().getDate() - 7);
    return coldCases.filter(d => new Date(d.created_at) >= weekAgo).length;
  }, [coldCases]);
  const coldThisMonth = useMemo(() => {
    const now = new Date();
    return coldCases.filter(d => {
      const dDate = new Date(d.created_at);
      return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    }).length;
  }, [coldCases]);

  // Fièvre Typhoïde
  const typhoidCases = useMemo(() => diagnostics.filter(d => d.disease_name.toLowerCase().includes('typho') || d.disease_name.toLowerCase().includes('salmo')).length, [diagnostics]);
  
  // Gastro-entérite
  const gastroCases = useMemo(() => diagnostics.filter(d => d.disease_name.toLowerCase().includes('gastro') || d.disease_name.toLowerCase().includes('diarrh')).length, [diagnostics]);

  // HTA & Diabète
  const chronicCases = useMemo(() => diagnostics.filter(d => d.disease_name.toLowerCase().includes('hta') || d.disease_name.toLowerCase().includes('hyperten') || d.disease_name.toLowerCase().includes('diab')).length, [diagnostics]);

  // ─── ÉTAT CLINIQUE À L'ARRIVÉE & ÉVOLUTION DU PATIENT ────────────────────────
  const arrivalStatsData = useMemo(() => {
    const counts = { stable: 0, surveiller: 0, urgent: 0, grave: 0, critique: 0 };
    patients.forEach(p => {
      const st = (p.arrival_status || 'stable') as keyof typeof counts;
      if (counts[st] !== undefined) counts[st]++;
      else counts.stable++;
    });

    return [
      { name: isArabic ? 'مستقرة (Stable)' : 'Stable', value: counts.stable, color: '#10b981' },
      { name: isArabic ? 'تحت المراقبة (Surveillance)' : 'À Surveiller', value: counts.surveiller, color: '#3b82f6' },
      { name: isArabic ? 'عاجلة (Urgent)' : 'Urgent', value: counts.urgent, color: '#f59e0b' },
      { name: isArabic ? 'خطيرة (Grave)' : 'Grave', value: counts.grave, color: '#f97316' },
      { name: isArabic ? 'حرجة (Critique)' : 'Critique', value: counts.critique, color: '#ef4444' },
    ].filter(s => s.value > 0);
  }, [patients, isArabic]);

  const evolutionStatsData = useMemo(() => {
    const counts = { en_traitement: 0, gueri: 0, en_observation: 0, transfere: 0, chronique: 0 };
    diagnostics.forEach(d => {
      const ev = (d.evolution_status || 'en_traitement') as keyof typeof counts;
      if (counts[ev] !== undefined) counts[ev]++;
      else counts.en_traitement++;
    });

    return [
      { name: isArabic ? 'تم الشفاء (Guéri)' : 'Guéri / Traité', value: counts.gueri, color: '#10b981' },
      { name: isArabic ? 'قيد العلاج (En cours)' : 'En Traitement', value: counts.en_traitement, color: '#3b82f6' },
      { name: isArabic ? 'تحت المراقبة (Observation)' : 'En Observation', value: counts.en_observation, color: '#8b5cf6' },
      { name: isArabic ? 'مزمن (Chronique)' : 'Chronique / Suivi', value: counts.chronique, color: '#f59e0b' },
      { name: isArabic ? 'محول (Transféré)' : 'Transféré / Évacué', value: counts.transfere, color: '#ef4444' },
    ];
  }, [diagnostics, isArabic]);

  // Top pathologies bar chart data
  const topPathologiesData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDiagnostics.forEach(d => {
      map[d.disease_name] = (map[d.disease_name] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, total: count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [filteredDiagnostics]);

  // ─── DÉMOGRAPHIE GÉNÉRALE ──────────────────────────────────────────────────
  const totalPatientsCount = patients.length;
  const malePatientsCount = useMemo(() => patients.filter(p => p.sex === 'M').length, [patients]);
  const femalePatientsCount = useMemo(() => patients.filter(p => p.sex === 'F').length, [patients]);
  const childPatientsCount = useMemo(() => patients.filter(p => {
    const age = parseInt(p.age as any) || 0;
    return age > 0 && age < 18;
  }).length, [patients]);
  const pregnantPatientsCount = useMemo(() => patients.filter(p => p.is_pregnant || p.visit_reason?.toLowerCase().includes('grossesse')).length, [patients]);

  const demographicChartData = useMemo(() => [
    { name: isArabic ? 'رجال' : 'Hommes', value: malePatientsCount, color: '#3b82f6' },
    { name: isArabic ? 'نساء' : 'Femmes', value: femalePatientsCount, color: '#ec4899' },
    { name: isArabic ? 'أطفال' : 'Enfants (<18 ans)', value: childPatientsCount, color: '#10b981' },
  ], [malePatientsCount, femalePatientsCount, childPatientsCount, isArabic]);

  // ─── FINANCES GLOBALES ─────────────────────────────────────────────────────
  const totalCareRevenue = useMemo(() => carePayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0), [carePayments]);
  const totalPharmacyRevenue = useMemo(() => pharmacySales.reduce((acc, s) => acc + (parseFloat(s.total_price) || 0), 0), [pharmacySales]);
  const grandTotalRevenue = totalCareRevenue + totalPharmacyRevenue;

  // ─── UTILISATEURS (CRÉATION, SUSPENSION, MDP) ──────────────────────────────
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    try {
      const { error } = await supabase.from('app_users').insert([{
        id: `USER-${Date.now()}`,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password || 'demo123',
        role: newUser.role,
        status: 'actif',
        phone: newUser.phone.trim() || null,
        service: newUser.service.trim() || null,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      setShowUserModal(false);
      setNewUser({ name: '', email: '', password: 'demo123', role: 'medecin', phone: '', service: 'Médecine Générale' });
      setToastMsg(isArabic ? 'تم إنشاء حساب المستخدم بنجاح !' : 'Compte utilisateur créé avec succès !');
      setTimeout(() => setToastMsg(''), 4000);
      loadData();
    } catch (e: any) {
      setToastMsg('Erreur: ' + (e.message || ''));
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const handleToggleUserStatus = async (userItem: AppUser) => {
    const nextStatus = userItem.status === 'actif' ? 'suspendu' : 'actif';
    try {
      await supabase.from('app_users').update({ status: nextStatus }).eq('id', userItem.id);
      setUsersList(prev => prev.map(u => u.id === userItem.id ? { ...u, status: nextStatus } : u));
      setToastMsg(
        nextStatus === 'suspendu'
          ? (isArabic ? `تم تعليق حساب ${userItem.name}` : `Compte ${userItem.name} suspendu.`)
          : (isArabic ? `تم تنشيط حساب ${userItem.name}` : `Compte ${userItem.name} réactivé.`)
      );
      setTimeout(() => setToastMsg(''), 3500);
    } catch (e: any) {
      setToastMsg('Erreur: ' + e.message);
      setTimeout(() => setToastMsg(''), 3500);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser || !newPasswordVal) return;

    try {
      await supabase.from('app_users').update({ password: newPasswordVal }).eq('id', resetPwdUser.id);
      setResetPwdUser(null);
      setToastMsg(isArabic ? `تم تحديث كلمة المرور لـ ${resetPwdUser.name}` : `Mot de passe réinitialisé pour ${resetPwdUser.name} !`);
      setTimeout(() => setToastMsg(''), 4000);
    } catch (e: any) {
      setToastMsg('Erreur: ' + e.message);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const handleUpdateDiagStatus = async (diagId: string, status: any) => {
    await updateDiagnosticEvolution(diagId, status);
    loadData();
  };

  const filteredUsers = usersList.filter(u => {
    const matchQuery = !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchQuery && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-2xl text-sm font-bold flex items-center gap-2 border border-slate-700">
          <CheckCircle className="w-5 h-5 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Super Admin */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {isArabic ? 'لوحة القيادة والمراقبة العامة (Super Admin)' : 'Tableau de Bord & Supervision Clinique'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black uppercase">
                {isArabic ? 'إشراف كلي' : 'Supervision & Épidémiologie'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              {isArabic
                ? 'متابعة مباشرة للأمراض (الملاريا، الزكام...)، تطور الحالات، الطاقم الطبي والمداخيل'
                : 'Suivi en direct des pathologies (paludisme, rhume...), évolution des patients, finances et comptes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} className="cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh', 'Actualiser')}
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer">
            <Calendar className="w-4 h-4 mr-2" />
            {t('btn.schedule_appointment', 'Planifier RDV')}
          </Button>
          <Button onClick={() => setShowUserModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('btn.new_user', 'Créer un Compte')}
          </Button>
        </div>
      </div>

      {/* ─── 4 CARTES KPI ÉPIDÉMIOLOGIQUES & CLINIQUES MAÎTRESSES ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PALUDISME (MALARIA) */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 text-white cursor-pointer" onClick={() => setActiveTab('pathologies')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-100">
                <span>🦟 {isArabic ? 'حالات الملاريا / البالوديزم' : 'Paludisme (Malaria)'}</span>
              </div>
              <p className="text-3xl font-black text-white mt-1.5">{malariaCases.length} <span className="text-xs font-normal">cas</span></p>
              <p className="text-[11px] mt-1 text-amber-200 font-semibold">
                📅 {malariaThisWeek} {isArabic ? 'هذا الأسبوع' : 'cette semaine'} · {malariaThisMonth} {isArabic ? 'هذا الشهر' : 'ce mois'} · {malariaSevere} {isArabic ? 'حالة خطيرة' : 'graves'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* RHUME / GRIPPE / RESPIRATOIRE */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-700 text-white cursor-pointer" onClick={() => setActiveTab('pathologies')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-100">
                <span>🤧 {isArabic ? 'الزكام والتهابات الجهاز التنفسي' : 'Rhumes & Grippes'}</span>
              </div>
              <p className="text-3xl font-black text-white mt-1.5">{coldCases.length} <span className="text-xs font-normal">cas</span></p>
              <p className="text-[11px] mt-1 text-blue-200 font-semibold">
                📅 {coldThisWeek} {isArabic ? 'هذا الأسبوع' : 'cette semaine'} · {coldThisMonth} {isArabic ? 'هذا الشهر' : 'ce mois'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* DÉMOGRAPHIE PATIENTS */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white cursor-pointer" onClick={() => setActiveTab('demographics')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-100">
                {isArabic ? 'إجمالي المرضى والحالات' : 'Dossiers Patients'}
              </p>
              <p className="text-3xl font-black text-white mt-1.5">{totalPatientsCount}</p>
              <p className="text-[11px] mt-1 text-purple-200 font-semibold">
                🚹 {malePatientsCount} {isArabic ? 'رجال' : 'Hommes'} · 🚺 {femalePatientsCount} {isArabic ? 'نساء' : 'Femmes'} · 👶 {childPatientsCount} {isArabic ? 'أطفال' : 'Enfants'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* CHIFFRE D'AFFAIRES */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white cursor-pointer" onClick={() => setActiveTab('financial')}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                {isArabic ? 'إجمالي المداخيل المحصلة' : 'Recettes Globales'}
              </p>
              <p className="text-3xl font-black text-white mt-1.5">
                {grandTotalRevenue.toLocaleString()} <span className="text-sm font-bold">{t('currency', 'FCFA')}</span>
              </p>
              <p className="text-[11px] mt-1 text-emerald-200 font-semibold">
                {isArabic ? 'العيادة :' : 'Clinique :'} {totalCareRevenue.toLocaleString()} · {isArabic ? 'الصيدلية :' : 'Pharmacie :'} {totalPharmacyRevenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── ONGLETS DE NAVIGATION DU SUPER ADMIN ──────────────────────────── */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: isArabic ? 'نظرة شاملة ومخططات' : 'Vue d\'Ensemble & Graphiques', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'pathologies', label: isArabic ? `الأمراض والأوبئة (${diagnostics.length})` : `Pathologies & Épidémiologie (${diagnostics.length})`, icon: <Stethoscope className="w-4 h-4" /> },
          { id: 'demographics', label: isArabic ? `الديموغرافيا (${totalPatientsCount})` : `Démographie Patients (${totalPatientsCount})`, icon: <Users className="w-4 h-4" /> },
          { id: 'financial', label: isArabic ? 'الحصيلة المالية والمداخيل' : 'Bilan Financier & Recettes', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'users', label: isArabic ? `إدارة المستخدمين (${usersList.length})` : `Gestion des Utilisateurs (${usersList.length})`, icon: <Shield className="w-4 h-4" /> },
          { id: 'activity', label: isArabic ? 'سجل العمليات والتدقيق' : 'Journal & Audit', icon: <Activity className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-xl',
              activeTab === tab.id
                ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 1 : VUE D'ENSEMBLE, ÉPIDÉMIOLOGIE & ÉVOLUTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Graphiques Principaux : Top Maladies + État Arrivée vs Évolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Pathologies (BarChart) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    {isArabic ? 'أبرز الأمراض المعالجة في مستوصف الشفاء' : 'Top Pathologies Traitées au Dispensaire'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{diagnostics.length} diagnostics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {topPathologiesData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-medium">
                    {isArabic ? 'لم يتم تسجيل أي تشخيص بعد' : 'Aucune pathologie enregistrée pour le moment.'}
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topPathologiesData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any) => [`${val} cas`, 'Nombre de cas']} />
                        <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* État Clinique à l'Arrivée (PieChart) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    {isArabic ? 'حالة المرضى عند الدخول (مستقر، حرج، عاجل...)' : 'État Clinique des Patients à l\'Arrivée'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{totalPatientsCount} patients</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={arrivalStatsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {arrivalStatsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} patients`, 'Total']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deuxième Ligne de Graphiques : Évolution & Bilan Démographique */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Taux de Guérison & Évolution Clinique */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                  <span>{isArabic ? 'تطور حالات المرضى وسير العلاج' : 'Évolution Clinique des Malades'}</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {diagnostics.filter(d => d.evolution_status === 'gueri').length} {isArabic ? 'حالة شفاء' : 'guérisons'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolutionStatsData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val: any) => [`${val} patients`, 'Nombre']} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {evolutionStatsData.map((entry, index) => (
                          <Cell key={`evo-bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Démographie (Hommes / Femmes / Enfants) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                  <span>{isArabic ? 'التوزيع الديموغرافي (رجال / نساء / أطفال)' : 'Répartition Démographique Globale'}</span>
                  <span className="text-xs font-semibold text-slate-400">{totalPatientsCount} patients</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographicChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {demographicChartData.map((entry, index) => (
                          <Cell key={`cell-demo-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} patients`, 'Total']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 2 : PATHOLOGIES & ÉPIDÉMIOLOGIE DÉTAILLÉE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pathologies' && (
        <div className="space-y-6">
          {/* Filtres de Période */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isArabic ? 'تصفية حسب الفترة :' : 'Période :'}</span>
              {(['all', 'today', 'week', 'month', 'year'] as const).map((pKey) => (
                <button
                  key={pKey}
                  onClick={() => setPeriod(pKey)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    period === pKey ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {pKey === 'all' ? (isArabic ? 'الكل' : 'Tout') :
                   pKey === 'today' ? (isArabic ? 'اليوم' : 'Aujourd\'hui') :
                   pKey === 'week' ? (isArabic ? 'آخر 7 أيام' : 'Cette Semaine') :
                   pKey === 'month' ? (isArabic ? 'هذا الشهر' : 'Ce Mois') :
                   (isArabic ? 'هذا العام' : 'Cette Année')}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isArabic ? 'بحث عن مرض أو مريض...' : 'Rechercher maladie ou patient...'}
                value={pathologySearch}
                onChange={e => setPathologySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Cartes Bilan par Pathologie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-amber-50/70 border-l-4 border-amber-500">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-amber-900">🦟 {isArabic ? 'الملاريا (Paludisme)' : 'Paludisme'}</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{malariaCases.length} cas</p>
                <p className="text-[11px] text-amber-600 mt-0.5">{malariaThisWeek} cette semaine · {malariaThisMonth} ce mois</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-blue-50/70 border-l-4 border-blue-500">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-blue-900">🤧 {isArabic ? 'الزكام والإنفلونزا' : 'Rhumes & Grippes'}</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{coldCases.length} cas</p>
                <p className="text-[11px] text-blue-600 mt-0.5">{coldThisWeek} cette semaine · {coldThisMonth} ce mois</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-orange-50/70 border-l-4 border-orange-500">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-orange-900">🦠 {isArabic ? 'حمى التيفوئيد' : 'Fièvre Typhoïde'}</p>
                <p className="text-2xl font-black text-orange-700 mt-1">{typhoidCases} cas</p>
                <p className="text-[11px] text-orange-600 mt-0.5">{gastroCases} gastro-entérites</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-purple-50/70 border-l-4 border-purple-500">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-purple-900">🩺 {isArabic ? 'أمراض مزمنة (ضغط/سكري)' : 'HTA & Diabète'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{chronicCases} cas</p>
                <p className="text-[11px] text-purple-600 mt-0.5">Suivi régulier actif</p>
              </CardContent>
            </Card>
          </div>

          {/* Registre des Diagnostics Patients Détaillé */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>{isArabic ? 'السجل الوبائي والتشخيصي للمرضى' : 'Registre des Diagnostics & Pathologies Enregistrées'}</span>
                <span className="text-xs text-slate-400">{filteredDiagnostics.length} diagnostics</span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Patient &amp; N°</th>
                    <th className="p-3.5">Maladie / Pathologie</th>
                    <th className="p-3.5">Niveau de Gravité</th>
                    <th className="p-3.5">Statut Évolution</th>
                    <th className="p-3.5">Médecin Traitant</th>
                    <th className="p-3.5">Traitement / Notes</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDiagnostics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {isArabic ? 'لا توجد بيانات تشخيصية مسجلة' : 'Aucun diagnostic trouvé.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDiagnostics.filter(d =>
                      !pathologySearch ||
                      d.disease_name.toLowerCase().includes(pathologySearch.toLowerCase()) ||
                      d.patient_name?.toLowerCase().includes(pathologySearch.toLowerCase())
                    ).map((diag) => (
                      <tr key={diag.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-900">{diag.patient_name || 'Patient'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{diag.patient_file_number || diag.patient_id?.slice(0, 8)}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-slate-800 text-xs">{diag.disease_name}</span>
                          <p className="text-[10px] text-slate-400">{diag.category || 'Général'}</p>
                        </td>
                        <td className="p-3.5">
                          <span className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase',
                            diag.severity === 'simple' ? 'bg-emerald-100 text-emerald-800' :
                            diag.severity === 'modere' ? 'bg-amber-100 text-amber-800' :
                            diag.severity === 'grave' ? 'bg-orange-100 text-orange-800' :
                            'bg-rose-100 text-rose-800 animate-pulse'
                          )}>
                            {diag.severity === 'simple' ? '🟢 Simple' :
                             diag.severity === 'modere' ? '🟡 Modéré' :
                             diag.severity === 'grave' ? '🟠 Grave' : '🔴 Critique'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={diag.evolution_status}
                            onChange={(e) => handleUpdateDiagStatus(diag.id, e.target.value)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer',
                              diag.evolution_status === 'gueri' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              diag.evolution_status === 'en_traitement' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              'bg-purple-50 text-purple-800 border-purple-200'
                            )}
                          >
                            <option value="en_traitement">💊 En traitement</option>
                            <option value="gueri">✅ Guéri / Traité</option>
                            <option value="en_observation">🏥 En observation</option>
                            <option value="transfere">🚑 Transféré</option>
                            <option value="chronique">🔄 Chronique</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          {diag.doctor_name}
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={diag.treatment_prescribed || diag.notes || ''}>
                          {diag.treatment_prescribed || diag.notes || '—'}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[10px]">
                          {new Date(diag.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 3 : DÉMOGRAPHIE COMPLÈTE (HOMMES, FEMMES, ENFANTS, GROSSESSES)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-blue-50/60 border-l-4 border-blue-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-blue-900">{isArabic ? 'الرجال' : 'Hommes'}</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{malePatientsCount}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {totalPatientsCount > 0 ? ((malePatientsCount / totalPatientsCount) * 100).toFixed(1) : 0}% {isArabic ? 'من المرضى' : 'du total'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-pink-50/60 border-l-4 border-pink-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-pink-900">{isArabic ? 'النساء' : 'Femmes'}</p>
                <p className="text-2xl font-black text-pink-700 mt-1">{femalePatientsCount}</p>
                <p className="text-xs text-pink-600 mt-0.5">
                  {totalPatientsCount > 0 ? ((femalePatientsCount / totalPatientsCount) * 100).toFixed(1) : 0}% {isArabic ? 'من المرضى' : 'du total'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-emerald-50/60 border-l-4 border-emerald-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-emerald-900">{isArabic ? 'الأطفال (<18 سنة)' : 'Enfants (< 18 ans)'}</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{childPatientsCount}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {totalPatientsCount > 0 ? ((childPatientsCount / totalPatientsCount) * 100).toFixed(1) : 0}% {isArabic ? 'من المرضى' : 'du total'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-purple-50/60 border-l-4 border-purple-600">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-purple-900">{isArabic ? 'الحوامل (متابعة CPN)' : 'Femmes Enceintes'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{pregnantPatientsCount}</p>
                <p className="text-xs text-purple-600 mt-0.5">Suivi prénatal actif</p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau Registre Patients */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>{isArabic ? 'قائمة المرضى المسجلين في مستوصف الشفاء' : 'Registre des Patients Enregistrés'}</span>
                <span className="text-xs text-slate-400">{patients.length} dossiers</span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">N° Dossier</th>
                    <th className="p-3.5">Nom &amp; Prénom</th>
                    <th className="p-3.5">Âge / Sexe</th>
                    <th className="p-3.5">Téléphone</th>
                    <th className="p-3.5">Motif</th>
                    <th className="p-3.5">État Arrivée</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.slice(0, 15).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{p.patient_number || p.id?.slice(0, 8)}</td>
                      <td className="p-3.5 font-extrabold text-slate-800">{p.first_name} {p.last_name || p.name}</td>
                      <td className="p-3.5">
                        <span className={cn('px-2 py-0.5 rounded-md font-bold text-[10px]', p.sex === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800')}>
                          {p.age ? `${p.age} ans` : 'N/A'} · {p.sex === 'M' ? 'M' : 'F'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{p.phone || '—'}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{p.visit_reason || 'Consultation'}</td>
                      <td className="p-3.5">
                        <StatusBadge status={p.arrival_status || 'stable'} />
                      </td>
                      <td className="p-3.5 text-slate-400 text-[10px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 4 : BILAN FINANCIER & RECETTES
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-0 shadow-sm bg-emerald-50/60 border border-emerald-200">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">{isArabic ? 'إجمالي المداخيل' : 'Total Recettes Brutes'}</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{grandTotalRevenue.toLocaleString()} FCFA</p>
                <p className="text-xs text-emerald-600 mt-1">Toutes prestations confondues</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-blue-50/60 border border-blue-200">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">{isArabic ? 'مداخيل الاستشارات والعلاجات' : 'Recettes Clinique & Soins'}</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{totalCareRevenue.toLocaleString()} FCFA</p>
                <p className="text-xs text-blue-600 mt-1">{carePayments.length} factures émises</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-purple-50/60 border border-purple-200">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">{isArabic ? 'مبيعات الصيدلية' : 'Recettes Pharmacie'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{totalPharmacyRevenue.toLocaleString()} FCFA</p>
                <p className="text-xs text-purple-600 mt-1">{pharmacySales.length} ventes directes</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                {isArabic ? 'سجل المقبوضات المالية والمعاملات' : 'Dernières Transactions & Encaissements'}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Réf Reçu</th>
                    <th className="p-3.5">Patient</th>
                    <th className="p-3.5">Prestation / Soin</th>
                    <th className="p-3.5">Montant (FCFA)</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carePayments.slice(0, 10).map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{pay.receipt_number || pay.id?.slice(0, 8)}</td>
                      <td className="p-3.5 font-extrabold text-slate-900">{pay.patient_name || 'Patient'}</td>
                      <td className="p-3.5 text-slate-700">{pay.care_title || pay.description || 'Consultation'}</td>
                      <td className="p-3.5 font-black text-emerald-700">{parseFloat(pay.amount || 0).toLocaleString()} FCFA</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700">
                          {pay.payment_method || 'Espèces'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[10px]">
                        {pay.created_at ? new Date(pay.created_at).toLocaleString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 5 : CONTRÔLE TOTAL DES UTILISATEURS (CRÉER / SUSPENDRE / MDP)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isArabic ? 'البحث بالاسم، البريد أو الدور...' : 'Rechercher par nom, email ou rôle...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">{isArabic ? 'جميع الأدوار' : 'Tous les Rôles'}</option>
                <option value="medecin">{t('role.medecin', 'Médecin')}</option>
                <option value="gynecologue">{t('role.gynecologue', 'Gynécologue')}</option>
                <option value="receptionniste">{t('role.receptionniste', 'Réceptionniste')}</option>
                <option value="infirmier">{t('role.infirmier', 'Infirmier')}</option>
                <option value="laborantin">{t('role.laborantin', 'Laborantin')}</option>
                <option value="radiologue">{t('role.radiologue', 'Radiologue')}</option>
                <option value="admin">{t('role.admin', 'Administrateur')}</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">{isArabic ? 'جميع الحالات' : 'Tous les Statuts'}</option>
                <option value="actif">{isArabic ? 'نشط' : 'Actif'}</option>
                <option value="suspendu">{isArabic ? 'معلق' : 'Suspendu'}</option>
              </select>

              <Button onClick={() => setShowUserModal(true)} className="bg-slate-900 text-white font-bold text-xs">
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                {t('btn.new_user', 'Créer un Utilisateur')}
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Utilisateur</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Rôle</th>
                    <th className="p-3.5">Service</th>
                    <th className="p-3.5">Statut Compte</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.admin;
                    const isSuspended = u.status !== 'actif';
                    return (
                      <tr key={u.id} className={cn('hover:bg-slate-50 transition-colors', isSuspended && 'bg-rose-50/30')}>
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.phone || 'Sans tél'}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 font-semibold">{u.email}</td>
                        <td className="p-3.5">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border', roleStyle.bg, roleStyle.text, roleStyle.border)}>
                            {t('role.' + u.role, u.role)}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">{u.service || 'Dispensaire Al Shifa'}</td>
                        <td className="p-3.5">
                          <span className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1.5',
                            !isSuspended ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', !isSuspended ? 'bg-emerald-600' : 'bg-rose-600')} />
                            {isArabic ? (!isSuspended ? 'نشط' : 'معلق') : (!isSuspended ? 'Actif' : 'Suspendu')}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                                !isSuspended
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              )}
                            >
                              {!isSuspended ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              <span>{isArabic ? (!isSuspended ? 'تعليق' : 'تنشيط') : (!isSuspended ? 'Suspendre' : 'Activer')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setResetPwdUser(u); setNewPasswordVal('alshifa123'); }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Réinitialiser le mot de passe"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ONGLET 6 : JOURNAL D'ACTIVITÉ
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              {isArabic ? 'سجل العمليات والتدقيق الأمني' : 'Journal d\'Audit & Sécurité Système'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { time: 'À l\'instant', user: 'Dr. Médecin Généraliste', action: 'Diagnostic Paludisme Simple enregistré pour P-102', type: 'info' },
              { time: 'Il y a 6 min', user: 'Caisse Principale', action: 'Encaissement 12,500 FCFA validé', type: 'success' },
              { time: 'Il y a 14 min', user: 'Laboratoire Al Shifa', action: 'Test Goutte Épaisse Paludisme validé (+)', type: 'info' },
              { time: 'Il y a 28 min', user: 'Infirmier Soins', action: 'Injection & Constantes enregistrées', type: 'info' },
              { time: 'Il y a 45 min', user: 'Accueil / Réception', action: 'Nouveau patient P-814 admis en consultation', type: 'success' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <div>
                    <span className="font-bold text-slate-800">{item.user}</span>
                    <span className="text-slate-500 ml-2">— {item.action}</span>
                  </div>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL CRÉATION NOUVEL UTILISATEUR ──────────────────────────────── */}
      {showUserModal && (
        <ModalShell
          title={isArabic ? 'إنشاء حساب مستخدم جديد' : 'Créer un Compte Métier'}
          subtitle={isArabic ? 'إضافة موظف جديد وتحديد صلاحياته' : 'Attribuez un rôle métier sécurisé à un collaborateur'}
          onClose={() => setShowUserModal(false)}
          maxWidth="md"
        >
          <form onSubmit={handleCreateUserSubmit} className="space-y-4">
            <FormField label={isArabic ? 'الاسم واللقب' : 'Nom & Prénom'} required>
              <ModalInput
                required
                placeholder="Dr. Jean Dupont"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              />
            </FormField>

            <FormField label={isArabic ? 'البريد الإلكتروني' : 'Adresse Email'} required>
              <ModalInput
                type="email"
                required
                placeholder="nom@alshifa.com"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            </FormField>

            <FormField label={isArabic ? 'كلمة المرور الافتراضية' : 'Mot de passe initial'} required>
              <ModalInput
                type="text"
                required
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
            </FormField>

            <FormField label={isArabic ? 'الدور الوظيفي' : 'Rôle Métier Attribué'} required>
              <ModalSelect
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              >
                <option value="medecin">{t('role.medecin', 'Médecin Généraliste')}</option>
                <option value="gynecologue">{t('role.gynecologue', 'Gynécologue / Maternité')}</option>
                <option value="receptionniste">{t('role.receptionniste', 'Réceptionniste (Accueil & Caisse)')}</option>
                <option value="infirmier">{t('role.infirmier', 'Infirmier / Soins')}</option>
                <option value="laborantin">{t('role.laborantin', 'Laborantin (Analyses)')}</option>
                <option value="radiologue">{t('role.radiologue', 'Radiologue (Imagerie)')}</option>
                <option value="admin">{t('role.admin', 'Administrateur Système')}</option>
              </ModalSelect>
            </FormField>

            <FormField label={isArabic ? 'القسم / التخصص' : 'Service / Spécialité'}>
              <ModalInput
                placeholder="Ex: Urgences, Pédiatrie, Caisse 1..."
                value={newUser.service}
                onChange={e => setNewUser({ ...newUser, service: e.target.value })}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <CancelButton onClick={() => setShowUserModal(false)} />
              <SubmitButton>
                {isArabic ? 'تأكيد الإنشاء' : 'Créer l\'utilisateur'}
              </SubmitButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─── MODAL RÉINITIALISATION MOT DE PASSE ────────────────────────────── */}
      {resetPwdUser && (
        <ModalShell
          title={isArabic ? `تغيير كلمة المرور: ${resetPwdUser.name}` : `Réinitialiser MDP: ${resetPwdUser.name}`}
          subtitle={isArabic ? 'تعيين كلمة مرور جديدة لهذا الحساب' : 'Définir un nouveau mot de passe de connexion'}
          onClose={() => setResetPwdUser(null)}
          maxWidth="sm"
        >
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <FormField label={isArabic ? 'كلمة المرور الجديدة' : 'Nouveau Mot de Passe'} required>
              <ModalInput
                type="text"
                required
                value={newPasswordVal}
                onChange={e => setNewPasswordVal(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
              <CancelButton onClick={() => setResetPwdUser(null)} />
              <SubmitButton>
                {isArabic ? 'تحديث كلمة المرور' : 'Enregistrer'}
              </SubmitButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Appointment Modal si déclenché */}
      {showAppointmentModal && (
        <AppointmentModal
          onClose={() => setShowAppointmentModal(false)}
          onSuccess={() => { setShowAppointmentModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
