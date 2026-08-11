import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Shield, 
  Users, 
  Activity, 
  TrendingUp, 
  Search, 
  Plus, 
  Settings, 
  BarChart3,
  RefreshCw,
  UserCheck,
  CheckCircle,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { UserRole } from '../types';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  phone?: string;
  service?: string;
  created_at?: string;
}

type TabType = 'overview' | 'users' | 'statistics' | 'settings';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal nouvel utilisateur
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '123456',
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
      else if (path === 'statistics' || path === '/dashboard/statistics') setActiveTab('statistics');
      else if (path === 'settings' || path === '/dashboard/settings') setActiveTab('settings');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('patients').select('id', { count: 'exact', head: true }),
      ]);

      setUsersList(uRes.data || []);
      setTotalPatients(pRes.count || 0);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    try {
      const { error } = await supabase.from('app_users').insert([{
        id: `USER-${Date.now()}`,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password || '123456',
        role: newUser.role,
        status: 'actif',
        phone: newUser.phone.trim() || null,
        service: newUser.service.trim() || null,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      setShowUserModal(false);
      setNewUser({ name: '', email: '', password: '123456', role: 'medecin', phone: '', service: 'Médecine Générale' });
      setToastMsg('Compte utilisateur créé avec succès !');
      setTimeout(() => setToastMsg(''), 4000);
      loadData();
    } catch (e: any) {
      setToastMsg('Erreur: ' + (e.message || ''));
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const filteredUsers = usersList.filter(u =>
    !searchQuery ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = usersList.filter(u => u.status === 'actif').length;
  const inactiveCount = usersList.filter(u => u.status !== 'actif').length;

  const stats = [
    {
      title: 'Comptes Utilisateurs',
      value: usersList.length.toString(),
      sub: `${activeCount} actifs · ${inactiveCount} inactifs`,
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Utilisateurs Actifs',
      value: activeCount.toString(),
      sub: 'En service actuellement',
      icon: <UserCheck className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Dossiers Patients',
      value: totalPatients.toString(),
      sub: 'Enregistrés dans le système',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Services Déployés',
      value: '8',
      sub: 'Modules actifs',
      icon: <Shield className="w-6 h-6" />,
      color: 'from-slate-700 to-slate-900',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administration Clinique Al Shifa</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestion globale de la plateforme et des droits des utilisateurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowUserModal(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Créer un Utilisateur
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
        {(['overview', 'users', 'statistics', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'users' ? `Utilisateurs (${usersList.length})` :
             tab === 'statistics' ? 'Statistiques' : 'Paramètres'}
          </button>
        ))}
      </div>

      {/* OVERVIEW & USERS */}
      {(activeTab === 'overview' || activeTab === 'users') && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-base">Liste des Utilisateurs de la Clinique</CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none w-64"
                  placeholder="Rechercher par nom, rôle..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={6} />
            ) : filteredUsers.length === 0 ? (
              <EmptyState type="search" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 uppercase">
                      <th className="text-left py-3 px-3">Nom</th>
                      <th className="text-left py-3 px-3">Email</th>
                      <th className="text-left py-3 px-3">Rôle</th>
                      <th className="text-left py-3 px-3">Service</th>
                      <th className="text-center py-3 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800">{u.name}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{u.email}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{u.service || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={u.status || 'actif'} />
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

      {/* STATISTICS */}
      {activeTab === 'statistics' && (
        <div className="space-y-5">
          {/* Répartition par rôle */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Répartition des Utilisateurs par Rôle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {['admin','medecin','gynecologue','infirmier','laborantin','receptionniste','pharmacien','caissier'].map(role => {
                  const count = usersList.filter(u => u.role === role).length;
                  return (
                    <div key={role} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                      <p className="text-2xl font-bold text-slate-800">{count}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{role}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Résumé statistique */}
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Utilisateurs</p>
                    <p className="text-2xl font-bold text-slate-800">{usersList.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Taux d'Activité</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {usersList.length > 0 ? Math.round((usersList.filter(u => u.status === 'actif').length / usersList.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dossiers Patients</p>
                    <p className="text-2xl font-bold text-slate-800">{totalPatients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" /> Informations de l'Établissement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Nom de l\'établissement', value: 'Clinique Médicale Al Shifa' },
                  { label: 'Type', value: 'Clinique Médicale Privée' },
                  { label: 'Plateforme', value: 'Supabase (Connectée)' },
                  { label: 'Version Application', value: 'v1.0.0' },
                  { label: 'Modules Actifs', value: '8 services' },
                  { label: 'Statut', value: 'Opérationnel ✓' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className="font-semibold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Rôles et Accès
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                {['admin','medecin','gynecologue','infirmier','laborantin','receptionniste','pharmacien','pharmacien_chef','caissier','secretary','radiologue'].map(role => (
                  <div key={role} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700 capitalize">{role}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Actif</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Créer Utilisateur */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-slate-300" />
                <h2 className="font-bold text-lg">Créer un Compte Utilisateur</h2>
              </div>
              <button onClick={() => setShowUserModal(false)} className="p-1 text-white hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Nom complet *</label>
                <input
                  required
                  placeholder="Ex: Dr. Ahmed Benali"
                  className="w-full px-3 py-2 border rounded-xl outline-none"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  placeholder="ahmed@alshifa.dz"
                  className="w-full px-3 py-2 border rounded-xl outline-none"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Rôle *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none font-bold text-slate-800"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  >
                    <option value="medecin">Médecin</option>
                    <option value="gynecologue">Gynécologue</option>
                    <option value="receptionniste">Réceptionniste</option>
                    <option value="pharmacien">Pharmacien</option>
                    <option value="laborantin">Laborantin</option>
                    <option value="infirmier">Infirmier/ère</option>
                    <option value="caissier">Caissier/ère</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Service / Département</label>
                <input
                  placeholder="Ex: Médecine Générale, Urgences..."
                  className="w-full px-3 py-2 border rounded-xl outline-none"
                  value={newUser.service}
                  onChange={e => setNewUser({ ...newUser, service: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowUserModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  Créer le Compte
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
