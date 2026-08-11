import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Upload, 
  Eye, 
  RefreshCw,
  X,
  FileCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { LabTest } from '../types';

type TabType = 'overview' | 'requests' | 'results';

export function LaboratoryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Modal Saisie Résultat
  const [resultModalTest, setResultModalTest] = useState<LabTest | null>(null);
  const [resultText, setResultText] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const { labTests, loading, reload, updateResult } = useLabRequests({ limit: 100 });

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'requests' || path === '/dashboard/requests') setActiveTab('requests');
      else if (path === 'results' || path === '/dashboard/results') setActiveTab('results');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const handleSaveResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModalTest || !resultText.trim()) return;

    setSavingResult(true);
    const success = await updateResult(
      resultModalTest.id,
      resultText.trim(),
      `Laborantin ${user?.firstName} ${user?.lastName}`
    );
    setSavingResult(false);

    if (success) {
      // Envoyer une notification au médecin traitant
      try {
        await supabase.from('notifications').insert([{
          recipient_role: 'medecin',
          type: 'lab_result',
          title: 'Résultat d\'analyse disponible',
          message: `Les résultats de l'analyse ${resultModalTest.test_name} ont été validés par le laboratoire.`,
          entity_type: 'lab_test',
          entity_id: resultModalTest.id,
          is_read: false,
        }]);
      } catch {
        // ignore notification error
      }

      setResultModalTest(null);
      setResultText('');
      setToastMsg('Résultat validé et transmis au médecin !');
      setTimeout(() => setToastMsg(''), 4000);
      reload();
    } else {
      setToastMsg('Erreur lors de la validation du résultat.');
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const pendingRequests = labTests.filter(l => l.status === 'en_attente');
  const inProgressRequests = labTests.filter(l => l.status === 'en_cours');
  const completedRequests = labTests.filter(l => l.status === 'termine');
  const urgentRequests = labTests.filter(l => l.urgence && l.status !== 'termine');

  const filteredTests = labTests.filter(l =>
    !searchQuery ||
    l.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.requested_by?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    {
      title: 'Demandes en Attente',
      value: pendingRequests.length.toString(),
      sub: 'À traiter en priorité',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Analyses en Cours',
      value: inProgressRequests.length.toString(),
      sub: 'En traitement',
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Résultats Validés',
      value: completedRequests.length.toString(),
      sub: 'Transmis au médecin',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Analyses Urgentes',
      value: urgentRequests.length.toString(),
      sub: 'Priorité haute',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'from-red-500 to-rose-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 shadow-lg text-sm font-medium flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-purple-600" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laboratoire d'Analyses Médicales</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {user?.firstName} {user?.lastName} — réception des demandes et validation des résultats
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
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
        {(['overview', 'requests', 'results'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'requests' ? `Demandes En Attente (${pendingRequests.length})` : `Résultats Validés (${completedRequests.length})`}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-base">Demandes d'Analyses Médicales</CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none w-56"
                  placeholder="Filtrer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={6} />
            ) : filteredTests.length === 0 ? (
              <EmptyState title="Aucune demande transmise" description="Les demandes des médecins et gynécologues s'afficheront automatiquement." />
            ) : (
              <div className="space-y-3">
                {filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/40 border border-slate-200/70 transition-all flex items-center justify-between flex-wrap gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{test.test_name}</p>
                          {test.urgence && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              🚨 URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Demandé par : <strong className="text-slate-700">{test.requested_by}</strong>
                        </p>
                        {test.results_text && (
                          <p className="text-xs text-emerald-700 font-mono font-semibold mt-1 bg-emerald-50 p-1.5 rounded-lg">
                            Résultat : {test.results_text}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={test.status} />
                      {test.patient_id && (
                        <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(test.patient_id)}>
                          <Eye className="w-4 h-4 mr-1 text-blue-600" /> Patient
                        </Button>
                      )}
                      {test.status !== 'termine' && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            setResultModalTest(test);
                            setResultText(test.results_text || '');
                          }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Saisir Résultat
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* REQUESTS ONLY */}
      {activeTab === 'requests' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demandes Non Traitées</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <EmptyState title="Aucune demande en attente" />
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((test) => (
                  <div key={test.id} className="p-4 rounded-xl border bg-white flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{test.test_name}</p>
                      <p className="text-slate-500">Par : {test.requested_by}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        setResultModalTest(test);
                        setResultText('');
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" /> Saisir Résultat
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RESULTS ONLY */}
      {activeTab === 'results' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Historique des Analyses Validées</CardTitle>
          </CardHeader>
          <CardContent>
            {completedRequests.length === 0 ? (
              <EmptyState title="Aucun résultat archivé" />
            ) : (
              <div className="space-y-3">
                {completedRequests.map((test) => (
                  <div key={test.id} className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-800 text-sm">{test.test_name}</span>
                      <StatusBadge status="termine" />
                    </div>
                    <p className="text-slate-500">Demandeur : {test.requested_by} | Validé par : {test.validated_by || 'Laboratoire'}</p>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 font-mono">
                      <strong>Résultat officiel :</strong> {test.results_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Saisie / Validation de Résultat */}
      {resultModalTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-purple-200" />
                <div>
                  <h2 className="font-bold text-lg">Saisie des Résultats</h2>
                  <p className="text-xs text-purple-200">{resultModalTest.test_name}</p>
                </div>
              </div>
              <button onClick={() => setResultModalTest(null)} className="p-1 text-white hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResultSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border text-slate-700">
                <p><strong>Analyse :</strong> {resultModalTest.test_name}</p>
                <p><strong>Demandeur :</strong> {resultModalTest.requested_by}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Résultats Biologiques & Observations *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ex: Hémoglobine: 13.5 g/dL, Leucocytes: 7,200 /mm3..."
                  className="w-full px-3 py-2 border rounded-xl outline-none font-mono text-xs focus:ring-2 focus:ring-purple-500"
                  value={resultText}
                  onChange={e => setResultText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setResultModalTest(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={savingResult} className="bg-purple-600 hover:bg-purple-700">
                  {savingResult ? 'Validation...' : 'Valider & Transmettre au Médecin'}
                </Button>
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
