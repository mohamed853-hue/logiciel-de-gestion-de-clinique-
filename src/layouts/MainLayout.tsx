import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { ClinicSettingsModal } from '../components/ClinicSettingsModal';
import { useClinicSettings } from '../services/clinicSettingsService';
import { cn } from '../utils/cn';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FlaskConical,
  Syringe,
  CreditCard,
  Activity,
  FileText,
  ShoppingCart,
  Settings,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ClipboardList,
  ChevronRight,
  Heart,
  CheckCheck,
  Clock,
  FlaskConical as LabIcon,
  Pill,
} from 'lucide-react';
import type { UserRole } from '../types';

// =============================================================================
// NAVIGATION PAR RÔLE
// =============================================================================
const navigationItems: Record<UserRole, Array<{ name: string; icon: React.ReactNode; tab: string }>> = {
  receptionniste: [
    { name: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Patients', icon: <Users className="w-5 h-5" />, tab: 'patients' },
    { name: 'Rendez-vous', icon: <Calendar className="w-5 h-5" />, tab: 'appointments' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Pharmacie & Stock', icon: <ShoppingCart className="w-5 h-5" />, tab: 'pharmacy' },
    { name: 'Caisse & Factures', icon: <CreditCard className="w-5 h-5" />, tab: 'cashier' },
    { name: 'Historique', icon: <ClipboardList className="w-5 h-5" />, tab: 'history' },
    { name: 'Statistiques', icon: <BarChart3 className="w-5 h-5" />, tab: 'stats' },
  ],

  medecin: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Consultations', icon: <Stethoscope className="w-5 h-5" />, tab: 'patients' },
    { name: 'Rendez-vous', icon: <Calendar className="w-5 h-5" />, tab: 'appointments' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Analyses', icon: <FlaskConical className="w-5 h-5" />, tab: 'lab' },
  ],
  gynecologue: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Patientes', icon: <Users className="w-5 h-5" />, tab: 'patients' },
    { name: 'Consultations', icon: <Stethoscope className="w-5 h-5" />, tab: 'consultations' },
    { name: 'Grossesses', icon: <Heart className="w-5 h-5" />, tab: 'pregnancies' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Analyses', icon: <FlaskConical className="w-5 h-5" />, tab: 'labs' },
    { name: 'Rendez-vous', icon: <Calendar className="w-5 h-5" />, tab: 'appointments' },
  ],
  laborantin: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Demandes', icon: <FlaskConical className="w-5 h-5" />, tab: 'requests' },
    { name: 'Résultats', icon: <FileText className="w-5 h-5" />, tab: 'results' },
    { name: 'Patients', icon: <Users className="w-5 h-5" />, tab: 'patients' },
  ],
  infirmier: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Tâches', icon: <Syringe className="w-5 h-5" />, tab: 'tasks' },
    { name: 'Patients', icon: <Users className="w-5 h-5" />, tab: 'patients' },
    { name: 'Constantes', icon: <Activity className="w-5 h-5" />, tab: 'vitals' },
  ],
  radiologue: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Examens', icon: <Activity className="w-5 h-5" />, tab: 'exams' },
    { name: 'Résultats', icon: <FileText className="w-5 h-5" />, tab: 'results' },
  ],
  admin: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Utilisateurs', icon: <Users className="w-5 h-5" />, tab: 'users' },
    { name: 'Statistiques', icon: <Activity className="w-5 h-5" />, tab: 'statistics' },
    { name: 'Rapports', icon: <BarChart3 className="w-5 h-5" />, tab: 'reports' },
    { name: 'Paramètres', icon: <Settings className="w-5 h-5" />, tab: 'settings' },
  ],
};

// Libellé du rôle en français
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  medecin: 'Médecin',
  gynecologue: 'Gynécologue',
  infirmier: 'Infirmier/ère',
  laborantin: 'Laborantin',
  receptionniste: 'Réceptionniste',
  radiologue: 'Radiologue',
};

// Couleur accent par rôle
const ROLE_ACCENT: Record<string, string> = {
  medecin: 'from-blue-600 to-cyan-600',
  gynecologue: 'from-pink-600 to-rose-600',
  laborantin: 'from-purple-600 to-violet-600',
  infirmier: 'from-teal-600 to-emerald-600',
  receptionniste: 'from-blue-600 to-indigo-600',
  radiologue: 'from-slate-600 to-slate-700',
  admin: 'from-slate-700 to-slate-900',
};

// Icône de notification par type
function NotifIcon({ type }: { type: string }) {
  if (type === 'lab_result') return <LabIcon className="w-4 h-4 text-purple-500" />;
  if (type === 'prescription') return <Pill className="w-4 h-4 text-blue-500" />;
  if (type === 'appointment') return <Calendar className="w-4 h-4 text-teal-500" />;
  if (type === 'payment') return <CreditCard className="w-4 h-4 text-emerald-500" />;
  return <Bell className="w-4 h-4 text-slate-500" />;
}

// Navigation tab cible selon le type de notif et le rôle
function getNotifTab(type: string, role: string): string {
  if (type === 'lab_result' && role === 'medecin') return 'lab';
  if (type === 'lab_result' && role === 'laborantin') return 'requests';
  if (type === 'prescription') return 'prescriptions';
  if (type === 'appointment') return 'appointments';
  return 'overview';
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// =============================================================================
// LAYOUT PRINCIPAL
// =============================================================================
export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { settings: clinicSettings, setSettings: setClinicSettings } = useClinicSettings();
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Fermer le panel si clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    if (showNotifPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPanel]);

  // Gérer les changements d'onglet via CustomEvent
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      if (event.detail === 'settings') {
        if (user?.role === 'admin') {
          setShowSettingsModal(true);
        }
        return;
      }
      setActiveTab(event.detail);
    };
    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, [user]);

  const handleNavClick = (tab: string) => {
    if (tab === 'settings') {
      if (user?.role === 'admin') {
        setShowSettingsModal(true);
      }
      return;
    }
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent('changeTab', { detail: tab }));
  };

  // Charger les notifications complètes
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { supabase } = await import('../services/supabase');
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, is_read, created_at', { count: 'exact' })
        .eq('recipient_role', user.role)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data || []) as NotificationItem[]);
      setNotifCount((data || []).filter((n: any) => !n.is_read).length);
    } catch {
      setNotifCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  // Marquer une notification comme lue
  const markAsRead = async (id: string, type: string) => {
    try {
      const { supabase } = await import('../services/supabase');
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setNotifCount(prev => Math.max(0, prev - 1));
      // Naviguer vers l'onglet correspondant
      const tab = getNotifTab(type, user?.role || '');
      handleNavClick(tab);
      setShowNotifPanel(false);
    } catch { /* silent */ }
  };

  // Marquer tout comme lu
  const markAllRead = async () => {
    if (!user) return;
    try {
      const { supabase } = await import('../services/supabase');
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_role', user.role)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotifCount(0);
    } catch { /* silent */ }
  };

  const { language, setLanguage, isArabic, t } = useLanguage();

  if (!user) return null;

  const navItems = navigationItems[user.role] || [];
  const accentGradient = ROLE_ACCENT[user.role] || 'from-blue-700 to-indigo-700';
  const roleLabel = t('role.' + user.role, ROLE_LABELS[user.role] || user.role);

  return (
    <div className="min-h-screen bg-slate-50 flex" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ===== SIDEBAR ===== */}
      <aside
        className={cn(
          'fixed top-0 h-full flex flex-col z-50 transition-all duration-300 ease-in-out shadow-2xl',
          isArabic ? 'right-0' : 'left-0',
          `bg-gradient-to-b ${accentGradient}`,
          sidebarOpen ? 'w-64' : 'w-[70px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 p-4 border-b border-white/10',
          !sidebarOpen && 'justify-center'
        )}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20 shadow-xs">
            <img
              src={clinicSettings.logoUrl || '/logo.jpg'}
              alt={clinicSettings.clinicName || 'Al Shifa'}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as any).src = '/logo.jpg'; }}
            />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="font-bold text-white text-base leading-tight truncate">{clinicSettings.clinicName || t('app.title', 'Al Shifa')}</h1>
              <p className="text-white/70 text-[11px] mt-0.5 truncate">{clinicSettings.city ? `${clinicSettings.city}, ${clinicSettings.country}` : t('app.subtitle', 'Clinique Médicale')}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            const itemLabel = t('nav.' + item.tab, item.name);
            return (
              <button
                key={item.tab}
                onClick={() => handleNavClick(item.tab)}
                title={!sidebarOpen ? itemLabel : undefined}
                className={cn(
                  'w-full flex items-center rounded-xl transition-all duration-200 group relative cursor-pointer',
                  sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3',
                  isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className={cn('flex-shrink-0 transition-transform', isActive && 'scale-110')}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <>
                    <span className={cn('font-medium text-sm flex-1', isArabic ? 'text-right' : 'text-left')}>{itemLabel}</span>
                    {isActive && <ChevronRight className={cn('w-4 h-4 opacity-60', isArabic && 'rotate-180')} />}
                  </>
                )}
                {isActive && (
                  <span className={cn(
                    'absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white',
                    isArabic ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'
                  )} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Profil + Déconnexion */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-white/60 text-xs truncate">{roleLabel}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={!sidebarOpen ? t('logout', 'Déconnexion') : undefined}
            className={cn(
              'w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer',
              'text-white/70 hover:text-red-300 hover:bg-red-500/20',
              sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">{t('logout', 'Déconnexion')}</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-300',
        sidebarOpen
          ? isArabic ? 'mr-64' : 'ml-64'
          : isArabic ? 'mr-[70px]' : 'ml-[70px]'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">
                  {t('welcome', 'Bienvenue')}, {user.firstName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ===== PANNEAU NOTIFICATIONS ===== */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  onClick={() => { setShowNotifPanel(prev => !prev); if (!showNotifPanel) loadNotifications(); }}
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                >
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none animate-pulse">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>

                {/* Panel de notifications */}
                {showNotifPanel && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
                    {/* Header panel */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-600" />
                        <span className="font-bold text-slate-800 text-sm">Notifications</span>
                        {notifCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">{notifCount}</span>
                        )}
                      </div>
                      {notifCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Tout lire
                        </button>
                      )}
                    </div>

                    {/* Liste des notifications */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm font-medium">Aucune notification</p>
                          <p className="text-slate-300 text-xs mt-1">Vous êtes à jour !</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => markAsRead(notif.id, notif.type)}
                            className={cn(
                              'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3',
                              !notif.is_read && 'bg-blue-50/60'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                              !notif.is_read ? 'bg-blue-100' : 'bg-slate-100'
                            )}>
                              <NotifIcon type={notif.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn(
                                  'text-xs font-bold truncate',
                                  !notif.is_read ? 'text-slate-800' : 'text-slate-600'
                                )}>
                                  {notif.title}
                                </p>
                                {!notif.is_read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                {new Date(notif.created_at).toLocaleString('fr-FR', { 
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer panel */}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                      <p className="text-[10px] text-slate-400">Cliquez sur une notification pour y accéder</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-black flex items-center gap-1.5 transition-all text-slate-700 cursor-pointer shadow-2xs hover:scale-105"
                title={language === 'fr' ? 'Passer en Arabe (العربية)' : 'Passer en Français'}
              >
                <span className="text-sm">{language === 'fr' ? '🇸🇦' : '🇫🇷'}</span>
                <span className="font-bold">{language === 'fr' ? 'العربية' : 'Français'}</span>
              </button>

              {/* Settings Button (Réservé UNIQUEMENT au Super Admin / Admin) */}
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
                  title="Paramètres de la clinique & Tarifs (Admin)"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* Avatar */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md',
                `bg-gradient-to-br ${accentGradient}`
              )}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Paramètres Clinique Modal (Uniquement si Admin) */}
      {showSettingsModal && user.role === 'admin' && (
        <ClinicSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={(newSettings) => setClinicSettings(newSettings)}
        />
      )}
    </div>
  );
}
