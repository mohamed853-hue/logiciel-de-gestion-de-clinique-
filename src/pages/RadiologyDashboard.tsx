import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import {
  ModalShell,
  FormField,
  ModalTextarea,
  CancelButton,
  SubmitButton,
} from '../components/ModalShell';
import {
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import { useLanguage } from '../hooks/useLanguage';

interface RadioExam {
  id: string;
  patient_id?: string;
  patient_name?: string;
  exam_type: string;
  body_part?: string;
  priority: 'routine' | 'urgent';
  status: 'en_attente' | 'en_cours' | 'termine';
  requested_by?: string;
  results_text?: string;
  file_url?: string;
  created_at: string;
}

type TabType = 'overview' | 'exams' | 'results';

export function RadiologyDashboard() {
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [exams, setExams] = useState<RadioExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Modal saisie résultat
  const [resultModal, setResultModal] = useState<RadioExam | null>(null);
  const [resultText, setResultText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      // Essayer de charger depuis radiology_exams si disponible, sinon créer des données depuis les patients urgents
      const { data, error } = await supabase
        .from('radiology_exams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setExams(data);
      } else {
        setExams([]);
      }
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModal || !resultText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('radiology_exams')
        .update({ results_text: resultText.trim(), status: 'termine' })
        .eq('id', resultModal.id);

      if (error) throw error;
      setToastMsg('Résultat enregistré avec succès !');
      setTimeout(() => setToastMsg(''), 3000);
      setResultModal(null);
      setResultText('');
      loadExams();
    } catch {
      setToastMsg('Erreur lors de la sauvegarde');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const pending = exams.filter(e => e.status === 'en_attente');
  const inProgress = exams.filter(e => e.status === 'en_cours');
  const done = exams.filter(e => e.status === 'termine');
  const urgent = exams.filter(e => e.priority === 'urgent');

  const stats = [
    {
      title: 'Examens en attente',
      value: pending.length.toString(),
      sub: 'À traiter',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'En cours',
      value: inProgress.length.toString(),
      sub: 'En traitement',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Terminés',
      value: done.length.toString(),
      sub: 'Rapports disponibles',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Urgences',
      value: urgent.length.toString(),
      sub: 'Priorité haute',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'from-red-500 to-rose-500',
    },
  ];

  const filtered = exams.filter(ex =>
    !searchQuery ||
    ex.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.exam_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-slate-800">{t('radio.title', 'Imagerie Médicale & Radiologie')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{isArabic ? 'إدارة فحوصات الأشعة والتصوير الطبي والتقارير الإشعاعية' : 'Gestion des examens d\'imagerie médicale'}</p>
        </div>
        <Button variant="outline" onClick={loadExams}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('refresh', 'Actualiser')}
        </Button>
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
        {(['overview', 'exams', 'results'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'exams' ? `Examens (${exams.length})` : `Résultats (${done.length})`}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Examens en attente */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Examens en Attente
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
                <EmptyState title="Aucun examen en attente" description="Les demandes d'imagerie apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {pending.slice(0, 5).map(ex => (
                    <div key={ex.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{ex.patient_name || 'Patient'}</p>
                          <p className="text-xs text-slate-500">{ex.exam_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.priority === 'urgent' && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full">Urgent</span>
                        )}
                        <StatusBadge status={ex.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Résultats récents */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Résultats Récents
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
                <EmptyState title="Aucun résultat" description="Les résultats validés apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {done.slice(0, 5).map(ex => (
                    <div key={ex.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-slate-800 text-sm">{ex.patient_name || 'Patient'}</p>
                        <StatusBadge status={ex.status} />
                      </div>
                      <p className="text-slate-500">{ex.exam_type}</p>
                      {ex.results_text && (
                        <p className="mt-1.5 text-emerald-700 bg-emerald-50 p-1.5 rounded-lg font-mono">
                          {ex.results_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* EXAMS TAB */}
      {activeTab === 'exams' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <CardTitle className="text-base">Tous les Examens</CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                  placeholder="Rechercher patient, examen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="table" rows={6} />
            ) : filtered.length === 0 ? (
              <EmptyState title="Aucun examen" description="Les examens radiologiques apparaîtront ici." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                      <th className="text-left py-3 px-3">Patient</th>
                      <th className="text-left py-3 px-3">Type d'examen</th>
                      <th className="text-left py-3 px-3">Priorité</th>
                      <th className="text-center py-3 px-3">Statut</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ex => (
                      <tr key={ex.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-800">{ex.patient_name || 'N/A'}</td>
                        <td className="py-3 px-3 text-slate-600">{ex.exam_type}</td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-semibold',
                            ex.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          )}>
                            {ex.priority === 'urgent' ? 'Urgent' : 'Routine'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={ex.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          {ex.status !== 'termine' && (
                            <Button size="sm" onClick={() => { setResultModal(ex); setResultText(''); }}>
                              <FileText className="w-3.5 h-3.5 mr-1" /> Saisir résultat
                            </Button>
                          )}
                          {ex.results_text && (
                            <Button size="sm" variant="outline" onClick={() => setResultModal(ex)}>
                              <FileText className="w-3.5 h-3.5 mr-1" /> Voir rapport
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

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Résultats et Rapports d'Imagerie</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="list" rows={5} />
            ) : done.length === 0 ? (
              <EmptyState title="Aucun résultat disponible" description="Les images et rapports d'imagerie validés apparaîtront ici." />
            ) : (
              <div className="space-y-4">
                {done.map(ex => (
                  <div key={ex.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{ex.patient_name || 'Patient'}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{ex.exam_type} • {ex.body_part}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Demandé par : {ex.requested_by || 'N/A'}</p>
                      </div>
                      <StatusBadge status={ex.status} />
                    </div>
                    {ex.results_text && (
                      <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800 font-mono">
                        <strong>Résultat :</strong> {ex.results_text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal résultat */}
      {resultModal && (
        <ModalShell
          icon={<ImageIcon className="w-6 h-6 text-indigo-200" />}
          title="Saisie de Compte-Rendu d'Imagerie"
          subtitle={`Examen : ${resultModal.exam_type}`}
          color="indigo"
          maxWidth="lg"
          onClose={() => setResultModal(null)}
          footer={
            <>
              <CancelButton onClick={() => setResultModal(null)} />
              <SubmitButton
                loading={saving}
                loadingText="Enregistrement..."
                color="indigo"
                disabled={!resultText.trim()}
                onClick={handleSaveResult}
                form="radiology-result-form"
              >
                Valider le Compte-Rendu
              </SubmitButton>
            </>
          }
        >
          <form id="radiology-result-form" onSubmit={handleSaveResult} className="space-y-4">
            <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-800 text-sm">{resultModal.patient_name}</p>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">{resultModal.exam_type}</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold">
                Radiologie
              </span>
            </div>

            <FormField label="Résultats & Observations Réalisées" required hint="Saisissez les conclusions de l'examen d'imagerie.">
              <ModalTextarea
                accent="purple"
                required
                rows={6}
                placeholder="Description détaillée des images, anomalies observées, conclusion du radiologue..."
                value={resultText}
                onChange={e => setResultText(e.target.value)}
              />
            </FormField>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
