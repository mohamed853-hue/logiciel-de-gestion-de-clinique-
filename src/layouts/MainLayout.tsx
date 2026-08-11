import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  Package,
  Shield,
  Settings,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
  Truck,
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Heart,
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
    { name: 'Paiement Soins', icon: <CreditCard className="w-5 h-5" />, tab: 'payments' },
    { name: 'Caisse', icon: <ShoppingCart className="w-5 h-5" />, tab: 'cashier' },
    { name: 'Historique', icon: <ClipboardList className="w-5 h-5" />, tab: 'history' },
    { name: 'Statistiques', icon: <BarChart3 className="w-5 h-5" />, tab: 'stats' },
  ],
  pharmacien: [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Vente Rapide', icon: <ShoppingCart className="w-5 h-5" />, tab: 'quick-sale' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Stock', icon: <Package className="w-5 h-5" />, tab: 'stock' },
    { name: 'Entrées Stock', icon: <Truck className="w-5 h-5" />, tab: 'stock-entries' },
    { name: 'Alertes', icon: <AlertTriangle className="w-5 h-5" />, tab: 'alerts' },
    { name: 'Historique', icon: <ClipboardList className="w-5 h-5" />, tab: 'history' },
  ],
  pharmacien_chef: [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Stock', icon: <Package className="w-5 h-5" />, tab: 'stock' },
    { name: 'Entrées Stock', icon: <Truck className="w-5 h-5" />, tab: 'stock-entries' },
    { name: 'Alertes', icon: <AlertTriangle className="w-5 h-5" />, tab: 'alerts' },
    { name: 'Rapports', icon: <BarChart3 className="w-5 h-5" />, tab: 'reports' },
  ],
  medecin: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Patients', icon: <Users className="w-5 h-5" />, tab: 'patients' },
    { name: 'Consultations', icon: <Stethoscope className="w-5 h-5" />, tab: 'consultations' },
    { name: 'Ordonnances', icon: <FileText className="w-5 h-5" />, tab: 'prescriptions' },
    { name: 'Analyses', icon: <FlaskConical className="w-5 h-5" />, tab: 'labs' },
    { name: 'Rendez-vous', icon: <Calendar className="w-5 h-5" />, tab: 'appointments' },
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
  secretary: [
    { name: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Dossiers', icon: <FileText className="w-5 h-5" />, tab: 'records' },
    { name: 'Assurances', icon: <Shield className="w-5 h-5" />, tab: 'insurance' },
  ],
  caissier: [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'overview' },
    { name: 'Transactions', icon: <DollarSign className="w-5 h-5" />, tab: 'transactions' },
    { name: 'Factures', icon: <FileText className="w-5 h-5" />, tab: 'invoices' },
    { name: 'Dépenses', icon: <TrendingUp className="w-5 h-5" />, tab: 'expenses' },
    { name: 'Rapports', icon: <BarChart3 className="w-5 h-5" />, tab: 'reports' },
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
  secretary: 'Secrétaire',
  pharmacien: 'Pharmacien',
  pharmacien_chef: 'Pharmacien Chef',
  caissier: 'Caissier/ère',
};

// Couleur accent par rôle
const ROLE_ACCENT: Record<string, string> = {
  medecin: 'from-blue-600 to-cyan-600',
  gynecologue: 'from-pink-600 to-rose-600',
  laborantin: 'from-purple-600 to-violet-600',
  infirmier: 'from-teal-600 to-emerald-600',
  pharmacien: 'from-amber-600 to-orange-600',
  pharmacien_chef: 'from-amber-600 to-orange-600',
  caissier: 'from-emerald-600 to-teal-600',
  receptionniste: 'from-blue-600 to-indigo-600',
  radiologue: 'from-slate-600 to-slate-700',
  secretary: 'from-slate-600 to-slate-700',
  admin: 'from-slate-700 to-slate-900',
};

// =============================================================================
// LAYOUT PRINCIPAL
// =============================================================================
export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notifCount, setNotifCount] = useState(0);
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = navigationItems[user.role] || [];
  const accentGradient = ROLE_ACCENT[user.role] || 'from-blue-700 to-indigo-700';
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  // Gérer les changements d'onglet via CustomEvent
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };
    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent('changeTab', { detail: tab }));
  };

  // Charger le nombre de notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { supabase } = await import('../services/supabase');
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_role', user.role)
          .eq('is_read', false);
        setNotifCount(count || 0);
      } catch {
        setNotifCount(0);
      }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // refresh toutes les 30s
    return () => clearInterval(interval);
  }, [user.role]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300 ease-in-out shadow-2xl',
          `bg-gradient-to-b ${accentGradient}`,
          sidebarOpen ? 'w-64' : 'w-[70px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 p-4 border-b border-white/10',
          !sidebarOpen && 'justify-center'
        )}>
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20">
            <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg leading-none">Al Shifa</h1>
              <p className="text-white/60 text-xs mt-0.5 truncate">Clinique Médicale</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => handleNavClick(item.tab)}
                title={!sidebarOpen ? item.name : undefined}
                className={cn(
                  'w-full flex items-center rounded-xl transition-all duration-200 group relative',
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
                    <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
                  </>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
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
            title={!sidebarOpen ? 'Déconnexion' : undefined}
            className={cn(
              'w-full flex items-center rounded-xl transition-all duration-200',
              'text-white/70 hover:text-red-300 hover:bg-red-500/20',
              sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-[70px]'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">
                  Bienvenue, {user.firstName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
                <Settings className="w-5 h-5" />
              </button>
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
    </div>
  );
}
