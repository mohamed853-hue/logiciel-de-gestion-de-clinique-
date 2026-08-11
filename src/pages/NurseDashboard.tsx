import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  Syringe, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Activity,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Patient, VitalsRecord } from '../types';

type TabType = 'overview' | 'tasks' | 'patients' | 'vitals';

export function NurseDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [vitalsList, setVitalsList] = useState<VitalsRecord[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(true);

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<Patient | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Formulaire prise de constantes
  const [vitalsForm, setVitalsForm] = useState({
    tension: '',
    temp: '',
    poids: '',
    pouls: '',
    saturation: '',
    motif: 'Prise de constantes',
    soins: '',
  });

  const { patients, loading: loadingPatients, reload: reloadPatients } = usePatients({ limit: 100 });

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'tasks' || path === '/dashboard/tasks') setActiveTab('tasks');
      else if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'vitals' || path === '/dashboard/vitals') setActiveTab('vitals');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  useEffect(() => {
    loadVitals();
  }, []);

  const loadVitals = async () => {
    setLoadingVitals(true);
    try {
      const { data, error } = await supabase
        .from('vitals_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVitalsList(data || []);
    } catch (e) {
      console.error('Error loading vitals:', e);
    } finally {
      setLoadingVitals(false);
    }
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForVitals) return;

    try {
      const { error } = await supabase.from('vitals_records').insert([{
        patient_id: selectedPatientForVitals.id,
        tension: vitalsForm.tension || null,
        temp: vitalsForm.temp ? parseFloat(vitalsForm.temp) : null,
        poids: vitalsForm.poids ? parseFloat(vitalsForm.poids) : null,
        pouls: vitalsForm.pouls ? parseInt(vitalsForm.pouls) : null,
        motif: vitalsForm.motif || 'Soin infirmier',
        soins: vitalsForm.soins || null,
        created_by: `Infir. ${user?.firstName} ${user?.lastName}`,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      setShowVitalsForm(false);
      setSelectedPatientForVitals(null);
      setVitalsForm({ tension: '', temp: '', poids: '', pouls: '', saturation: '', motif: 'Prise de constantes', soins: '' });
      loadVitals();
      setSuccessMsg('Constantes et soins enregistrés avec succès !');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setSuccessMsg('Erreur: ' + (e.message || ''));
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const filteredPatients = patients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const urgentPatients = patients.filter(p => ['urgent', 'grave', 'critique'].includes(p.arrival_status || ''));

  const stats = [
    {
      title: 'Patients en soins',
      value: patients.length.toString(),
      sub: 'Enregistrés ce jour',
      icon: <Users className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      title: 'Prises de constantes',
      value: vitalsList.length.toString(),
      sub: 'Enregistrements totaux',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Urgences / À surveiller',
      value: urgentPatients.length.toString(),
      sub: 'Nécessitent attention',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'from-red-500 to-orange-500',
    },
    {
      title: 'Soins dispensés aujourd\'hui',
      value: vitalsList.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length.toString(),
      sub: 'Ce jour uniquement',
      icon: <Syringe className="w-6 h-6" />,
      color: 'from-purple-500 to-indigo-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Espace Infirmier / Infirmière</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {user?.firstName} {user?.lastName} — administration des soins et prise de constantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { reloadPatients(); loadVitals(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          {patients.length > 0 && (
            <Button onClick={() => { setSelectedPatientForVitals(patients[0]); setShowVitalsForm(true); }}>
              <Activity className="w-4 h-4 mr-2" />
              Prendre Constantes
            </Button>
          )}
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
        {(['overview', 'tasks', 'patients', 'vitals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'tasks' ? 'Soins & Tâches' :
             tab === 'patients' ? `Patients (${patients.length})` : `Constantes Végétatives (${vitalsList.length})`}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Patients nécessitant des soins */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600" /> Patients pour Soins & Constantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <LoadingState type="list" rows={5} />
              ) : patients.length === 0 ? (
                <EmptyState title="Aucun patient" />
              ) : (
                <div className="space-y-3">
                  {patients.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className="p-3.5 rounded-xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-200/60 transition-all flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                          {p.first_name?.[0]}{p.last_name?.[0] || p.name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{p.first_name} {p.last_name || p.name}</p>
                          <p className="text-slate-500">Motif: {p.visit_reason || 'Consultation'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.arrival_status || 'stable'} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatientForVitals(p);
                            setShowVitalsForm(true);
                          }}
                        >
                          <Activity className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                          Saisie
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dernières Prises de Constantes */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Historique Récents des Soins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVitals ? (
                <LoadingState type="list" rows={4} />
              ) : vitalsList.length === 0 ? (
                <EmptyState title="Aucune constante prise" />
              ) : (
                <div className="space-y-3">
                  {vitalsList.slice(0, 5).map((v) => (
                    <div key={v.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>{new Date(v.created_at).toLocaleString('fr-FR')}</span>
                        <span className="font-semibold text-slate-600">{v.created_by}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap font-mono font-bold text-slate-700">
                        {v.tension && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">TA: {v.tension}</span>}
                        {v.temp && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">T°: {v.temp}°C</span>}
                        {v.pouls && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Pouls: {v.pouls} bpm</span>}
                      </div>
                      {v.soins && <p className="text-slate-600 italic">Soin: {v.soins}</p>}
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
              <CardTitle className="text-base">Tous les Patients Enregistrés</CardTitle>
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
                    <th className="text-left py-2 px-2">Patient</th>
                    <th className="text-left py-2 px-2">Téléphone</th>
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
                        <Button size="sm" variant="outline" onClick={() => { setSelectedPatientForVitals(p); setShowVitalsForm(true); }}>
                          <Activity className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Prender Constantes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Prise de Constantes */}
      {showVitalsForm && selectedPatientForVitals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-teal-900 to-cyan-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-cyan-200" />
                <div>
                  <h2 className="font-bold text-lg">Prise de Constantes</h2>
                  <p className="text-xs text-cyan-200">{selectedPatientForVitals.first_name} {selectedPatientForVitals.last_name || selectedPatientForVitals.name}</p>
                </div>
              </div>
              <button onClick={() => setShowVitalsForm(false)} className="p-1 text-white hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Tension Artérielle (TA)</label>
                  <input
                    placeholder="Ex: 12/8"
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                    value={vitalsForm.tension}
                    onChange={e => setVitalsForm({ ...vitalsForm, tension: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Température (°C)</label>
                  <input
                    type="number" step="0.1"
                    placeholder="Ex: 37.2"
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                    value={vitalsForm.temp}
                    onChange={e => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Pouls (bpm)</label>
                  <input
                    type="number"
                    placeholder="Ex: 75"
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                    value={vitalsForm.pouls}
                    onChange={e => setVitalsForm({ ...vitalsForm, pouls: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Poids (kg)</label>
                  <input
                    type="number" step="0.5"
                    placeholder="Ex: 70"
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                    value={vitalsForm.poids}
                    onChange={e => setVitalsForm({ ...vitalsForm, poids: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Observations / Soins Réalisés</label>
                <textarea
                  rows={2}
                  placeholder="Injections, pansements, remarques..."
                  className="w-full px-3 py-2 border rounded-xl outline-none"
                  value={vitalsForm.soins}
                  onChange={e => setVitalsForm({ ...vitalsForm, soins: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowVitalsForm(false)}>Annuler</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Enregistrer dans le Dossier</Button>
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
