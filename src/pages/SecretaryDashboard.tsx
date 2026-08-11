import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileText,
  Clock,
  CheckCircle,
  Shield,
  Search,
  Plus,
  Folder,
  Users,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SecretaryRecord {
  id: string;
  patient_name: string;
  type: string;
  status: 'en_attente' | 'en_cours' | 'classe';
  documents?: string[];
  received_at?: string;
  notes?: string;
  created_at: string;
}

type TabType = 'overview' | 'records' | 'insurance';

export function SecretaryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [records, setRecords] = useState<SecretaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [totalPatients, setTotalPatients] = useState(0);

  // Modal nouveau dossier
  const [showModal, setShowModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patient_name: '',
    type: 'Dossier médical',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, patRes] = await Promise.all([
        supabase
          .from('secretary_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('patients').select('id', { count: 'exact', head: true }),
      ]);

      setRecords(recRes.data || []);
      setTotalPatients(patRes.count || 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.patient_name) return;
    try {
      const { error } = await supabase.from('secretary_records').insert([{
        patient_name: newRecord.patient_name.trim(),
        type: newRecord.type,
        notes: newRecord.notes.trim() || null,
        status: 'en_attente',
        created_by: `${user?.firstName} ${user?.lastName}`,
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setShowModal(false);
      setNewRecord({ patient_name: '', type: 'Dossier médical', notes: '' });
      setToastMsg('Dossier créé avec succès !');
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
    } catch (e: any) {
      setToastMsg('Erreur : ' + (e.message || ''));
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await supabase.from('secretary_records').update({ status: 'classe' }).eq('id', id);
      loadData();
    } catch { /* ignore */ }
  };

  const pending = records.filter(r => r.status === 'en_attente');
  const inProgress = records.filter(r => r.status === 'en_cours');
  const done = records.filter(r => r.status === 'classe');

  const filteredRecords = records.filter(r =>
    !searchQuery ||
    r.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    {
      title: 'Dossiers en attente',
      value: pending.length.toString(),
      sub: 'À traiter',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'En cours',
      value: inProgress.length.toString(),
      sub: 'En traitement',
      icon: <FileText className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Classés',
      value: done.length.toString(),
      sub: 'Archivés',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Total Patients',
      value: totalPatients.toString(),
      sub: 'Dossiers clinique',
      icon: <Users className="w-6 h-6" />,
      color: 'from-violet-500 to-purple-500',
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
          <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord Secrétariat</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {user?.firstName} {user?.lastName} — gestion administrative et dossiers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Dossier
          </Button>
        </div>
      </div>

      {/* Stats */}
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
        {(['overview', 'records', 'insurance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'records' ? `Dossiers (${records.length})` : 'Assurances'}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Dossiers en attente */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Dossiers en Attente
                </CardTitle>
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full">
                  {pending.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState type="list" rows={4} />
              ) : pending.length === 0 ? (
                <EmptyState title="Aucun dossier en attente" description="Les dossiers à traiter apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {pending.slice(0, 5).map(r => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{r.patient_name}</p>
                          <p className="text-xs text-slate-500">{r.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <Button size="sm" variant="ghost" onClick={() => handleMarkDone(r.id)}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dossiers classés */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Dossiers Récemment Classés
                </CardTitle>
                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">
                  {done.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState type="list" rows={4} />
              ) : done.length === 0 ? (
                <EmptyState title="Aucun dossier classé" description="Les dossiers archivés apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {done.slice(0, 5).map(r => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{r.patient_name}</p>
                        <p className="text-slate-500 mt-0.5">{r.type}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* RECORDS TAB */}
      {activeTab === 'records' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <CardTitle className="text-base">Gestion des Dossiers</CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none w-64"
                  placeholder="Rechercher dossier..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={6} />
            ) : filteredRecords.length === 0 ? (
              <EmptyState title="Aucun dossier" description="Créez un nouveau dossier avec le bouton en haut à droite." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                      <th className="text-left py-3 px-3">Patient</th>
                      <th className="text-left py-3 px-3">Type</th>
                      <th className="text-left py-3 px-3">Notes</th>
                      <th className="text-center py-3 px-3">Statut</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-800">{r.patient_name}</td>
                        <td className="py-3 px-3 text-slate-600">{r.type}</td>
                        <td className="py-3 px-3 text-slate-500 text-xs">{r.notes || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          {r.status !== 'classe' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkDone(r.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Classer
                            </Button>
                          )}
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

      {/* INSURANCE TAB */}
      {activeTab === 'insurance' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Gestion des Assurances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Module Assurances"
              description="La gestion des remboursements et assurances sera disponible prochainement."
            />
          </CardContent>
        </Card>
      )}

      {/* Modal Nouveau Dossier */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-white/80" />
                <h2 className="font-bold text-lg">Nouveau Dossier</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-white hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Patient *</label>
                <input
                  required
                  placeholder="Ex: Nom Prénom"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  value={newRecord.patient_name}
                  onChange={e => setNewRecord({ ...newRecord, patient_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type de Dossier</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  value={newRecord.type}
                  onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                >
                  <option>Dossier médical</option>
                  <option>Dossier administratif</option>
                  <option>Demande d'assurance</option>
                  <option>Compte-rendu</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  placeholder="Notes additionnelles..."
                  value={newRecord.notes}
                  onChange={e => setNewRecord({ ...newRecord, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Créer le Dossier</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
