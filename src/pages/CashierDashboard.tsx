import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Search,
  Printer,
  RefreshCw,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  CheckCircle,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface Transaction {
  id: string;
  patient_id?: string;
  type: string;
  montant: number;
  detail: string;
  status: string;
  payment_method?: string;
  source?: string;
  created_by?: string;
  created_at: string;
}

interface Depense {
  id: string;
  date_depense: string;
  categorie: string;
  description: string;
  montant: number;
  mode_paiement?: string;
  enregistre_par?: string;
  created_at: string;
}

type TabType = 'overview' | 'transactions' | 'invoices' | 'expenses' | 'reports';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function CashierDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    txCount: 0,
  });
  const [newDepense, setNewDepense] = useState({
    categorie: '',
    description: '',
    montant: '',
    mode_paiement: 'Espèces',
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [txRes, depRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('caisse_depenses').select('*').order('date_depense', { ascending: false }).limit(100),
      ]);

      const txData: Transaction[] = txRes.data || [];
      const depData: Depense[] = depRes.data || [];

      setTransactions(txData);
      setDepenses(depData);

      const validTx = txData.filter(t => t.status === 'validee');
      const todayRev = validTx
        .filter(t => new Date(t.created_at) >= todayStart)
        .reduce((s, t) => s + (t.montant || 0), 0);
      const weekRev = validTx
        .filter(t => new Date(t.created_at) >= weekStart)
        .reduce((s, t) => s + (t.montant || 0), 0);
      const monthRev = validTx
        .filter(t => new Date(t.created_at) >= monthStart)
        .reduce((s, t) => s + (t.montant || 0), 0);
      const totalExp = depData.reduce((s, d) => s + (d.montant || 0), 0);

      setStats({
        todayRevenue: todayRev,
        weekRevenue: weekRev,
        monthRevenue: monthRev,
        totalExpenses: totalExp,
        balance: monthRev - totalExp,
        txCount: validTx.length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepense = async () => {
    if (!newDepense.categorie || !newDepense.description || !newDepense.montant) return;
    try {
      const { error } = await supabase.from('caisse_depenses').insert([{
        categorie: newDepense.categorie,
        description: newDepense.description,
        montant: parseFloat(newDepense.montant),
        mode_paiement: newDepense.mode_paiement,
        enregistre_par: `${user?.firstName} ${user?.lastName}`,
        date_depense: new Date().toISOString(),
      }]);
      if (error) throw error;
      setNewDepense({ categorie: '', description: '', montant: '', mode_paiement: 'Espèces' });
      setShowDepenseForm(false);
      setSuccessMsg('Dépense enregistrée !');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadAll();
    } catch (e: any) {
      setSuccessMsg('Erreur: ' + e.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const weekChartData = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      days[key] = 0;
    }
    transactions
      .filter(t => t.status === 'validee')
      .forEach(t => {
        const d = new Date(t.created_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays <= 6) {
          const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
          days[key] = (days[key] || 0) + t.montant;
        }
      });
    return Object.entries(days).map(([name, montant]) => ({ name, montant }));
  })();

  const sourceData = (() => {
    const sources: Record<string, number> = {};
    transactions.filter(t => t.status === 'validee').forEach(t => {
      const src = t.source || t.type || 'Autre';
      sources[src] = (sources[src] || 0) + t.montant;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  })();

  const filteredTx = transactions.filter(t =>
    !search || t.detail?.toLowerCase().includes(search.toLowerCase()) ||
    t.type?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDA = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  const statCards = [
    { id: 'today', label: 'Revenus Aujourd\'hui', value: formatDA(stats.todayRevenue), icon: <DollarSign className="w-6 h-6" />, color: 'from-emerald-500 to-teal-500', trend: '+' },
    { id: 'week', label: 'Revenus 7 jours', value: formatDA(stats.weekRevenue), icon: <TrendingUp className="w-6 h-6" />, color: 'from-blue-500 to-cyan-500', trend: '+' },
    { id: 'month', label: 'Revenus ce mois', value: formatDA(stats.monthRevenue), icon: <BarChart3 className="w-6 h-6" />, color: 'from-purple-500 to-violet-500', trend: '+' },
    { id: 'expenses', label: 'Dépenses totales', value: formatDA(stats.totalExpenses), icon: <TrendingDown className="w-6 h-6" />, color: 'from-red-500 to-rose-500', trend: '-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {successMsg && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium',
          successMsg.includes('Erreur') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        )}>
          {successMsg.includes('Erreur') ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord Caisse</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion financière — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowDepenseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState type="cards" rows={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map(stat => (
            <button
              key={stat.id}
              onClick={() => setActiveTab(stat.id === 'expenses' ? 'expenses' : 'transactions')}
              className="group text-left"
            >
              <Card className="stat-card-motion border-0 shadow-sm cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', stat.color)}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className={cn('mt-3 text-xs font-medium flex items-center gap-1',
                    stat.trend === '+' ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {stat.trend === '+' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stats.txCount} transaction{stats.txCount > 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}


      <div className="flex gap-1 border-b border-slate-200">
        {([
          { tab: 'overview', label: 'Vue d\'ensemble' },
          { tab: 'transactions', label: 'Transactions' },
          { tab: 'expenses', label: 'Dépenses' },
          { tab: 'reports', label: 'Rapports' },
        ] as const).map(({ tab, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Revenus des 7 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekChartData.some(d => d.montant > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('fr-DZ')} />
                    <Tooltip formatter={(v: any) => [`${Number(v || 0).toLocaleString('fr-DZ')} DA`, 'Revenus']} />
                    <Bar dataKey="montant" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Aucune transaction" description="Aucun revenu sur les 7 derniers jours" />
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Sources de revenus
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sourceData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                        {sourceData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${Number(v || 0).toLocaleString('fr-DZ')} DA`, 'Montant']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {sourceData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-slate-600 flex-1 truncate">{item.name}</span>
                        <span className="font-medium text-slate-800">{item.value.toLocaleString('fr-DZ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="Aucune donnée" description="Les sources de revenus apparaîtront ici" />
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="p-6">
              <p className="text-white/60 text-sm mb-1">Solde ce mois</p>
              <p className={cn('text-3xl font-bold', stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {stats.balance >= 0 ? '+' : ''}{formatDA(stats.balance)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-xs">Revenus</p>
                  <p className="text-emerald-400 font-semibold">{formatDA(stats.monthRevenue)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Dépenses</p>
                  <p className="text-red-400 font-semibold">{formatDA(stats.totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dernières transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        {tx.payment_method === 'card' ? <CreditCard className="w-4 h-4 text-blue-600" /> : <Banknote className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{tx.detail}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{tx.montant.toLocaleString('fr-DZ')} DA</p>
                      <StatusBadge status={tx.status} size="sm" />
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <EmptyState title="Aucune transaction" />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Toutes les transactions</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none w-56"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-1" />
                  Imprimer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={8} />
            ) : filteredTx.length === 0 ? (
              <EmptyState type="search" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Détail</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Montant</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map(tx => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          <span className="text-xs text-slate-400 ml-1">
                            {new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 max-w-[200px] truncate">{tx.detail}</td>
                        <td className="py-3 px-3 text-slate-500 capitalize">{tx.type}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{tx.montant.toLocaleString('fr-DZ')} DA</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={tx.status} />
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

      {activeTab === 'expenses' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dépenses</CardTitle>
              <Button onClick={() => setShowDepenseForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showDepenseForm && (
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-700">Nouvelle dépense</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Catégorie *</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newDepense.categorie}
                      onChange={e => setNewDepense({ ...newDepense, categorie: e.target.value })}
                    >
                      <option value="">Choisir...</option>
                      <option>Médicaments</option>
                      <option>Équipement</option>
                      <option>Salaires</option>
                      <option>Eau/Électricité</option>
                      <option>Loyer</option>
                      <option>Fournitures</option>
                      <option>Maintenance</option>
                      <option>Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Mode paiement</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newDepense.mode_paiement}
                      onChange={e => setNewDepense({ ...newDepense, mode_paiement: e.target.value })}
                    >
                      <option>Espèces</option>
                      <option>Chèque</option>
                      <option>Virement</option>
                      <option>Carte</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Description *</label>
                    <input
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Description..."
                      value={newDepense.description}
                      onChange={e => setNewDepense({ ...newDepense, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Montant (DA) *</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                      value={newDepense.montant}
                      onChange={e => setNewDepense({ ...newDepense, montant: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleAddDepense}>Enregistrer</Button>
                  <Button variant="ghost" onClick={() => setShowDepenseForm(false)}>Annuler</Button>
                </div>
              </div>
            )}
            {depenses.length === 0 ? (
              <EmptyState title="Aucune dépense" description="Les dépenses enregistrées apparaîtront ici" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depenses.map(dep => (
                      <tr key={dep.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                        <td className="py-3 px-3"><span className="px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium">{dep.categorie}</span></td>
                        <td className="py-3 px-3 text-slate-700">{dep.description}</td>
                        <td className="py-3 px-3 text-right font-bold text-red-600">-{dep.montant.toLocaleString('fr-DZ')} DA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Rapports financiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Rapport journalier', desc: 'Transactions du jour', icon: <Calendar className="w-5 h-5" /> },
                { label: 'Rapport hebdomadaire', desc: '7 derniers jours', icon: <TrendingUp className="w-5 h-5" /> },
                { label: 'Rapport mensuel', desc: 'Ce mois complet', icon: <BarChart3 className="w-5 h-5" /> },
              ].map(r => (
                <button key={r.label} className="p-4 border border-slate-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 group-hover:bg-emerald-200 transition-colors">
                    {r.icon}
                  </div>
                  <p className="font-semibold text-slate-700 text-sm">{r.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
