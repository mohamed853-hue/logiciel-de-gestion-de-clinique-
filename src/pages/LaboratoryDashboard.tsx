import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import {
  ModalShell,
  ModalPortal,
  FormField,
  ModalTextarea,
  CancelButton,
  SubmitButton,
} from '../components/ModalShell';
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
  Paperclip,
  Download,
  ZoomIn
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../services/supabase';
import type { LabTest } from '../types';

type TabType = 'overview' | 'requests' | 'results';

export function LaboratoryDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Modal Saisie Résultat & Fichier Joit
  const [resultModalTest, setResultModalTest] = useState<LabTest | null>(null);
  const [resultText, setResultText] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

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
    let attachmentObj: { file_url: string; file_name?: string; file_type?: string; file_size?: number } | undefined = undefined;

    try {
      // Si un fichier est sélectionné, l'uploader sur Supabase Storage (bucket 'lab-results')
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const cleanFileName = `result_${resultModalTest.id}_${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('lab-results')
          .upload(cleanFileName, selectedFile, { upsert: true });

        if (uploadErr) {
          console.error('Storage upload error:', uploadErr);
          setToast({
            id: Date.now().toString(),
            type: 'error',
            title: 'Erreur d\'upload',
            description: 'Impossible d\'enregistrer le fichier joint. Enregistrement du texte seul...'
          });
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('lab-results')
            .getPublicUrl(cleanFileName);

          attachmentObj = {
            file_url: publicUrlData.publicUrl,
            file_name: selectedFile.name,
            file_type: selectedFile.type,
            file_size: selectedFile.size
          };
        }
      }

      const success = await updateResult(
        resultModalTest.id,
        resultText.trim(),
        `Laborantin ${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Laboratoire',
        attachmentObj
      );

      // Sauvegarder les remarques si renseignées
      if (resultRemarks.trim()) {
        try {
          const { supabase } = await import('../services/supabase');
          await supabase
            .from('lab_tests')
            .update({ remarks: resultRemarks.trim() })
            .eq('id', resultModalTest.id);
        } catch { /* silent */ }
      }

      if (success) {
        // Notification médecin
        try {
          await supabase.from('notifications').insert([{
            recipient_role: 'medecin',
            type: 'lab_result',
            title: 'Résultat d\'analyse disponible',
            message: `Résultats validés pour l'analyse : ${resultModalTest.test_name}`,
            entity_type: 'lab_test',
            entity_id: resultModalTest.id,
            is_read: false,
          }]);
        } catch {
          // ignore
        }

        setResultModalTest(null);
        setResultText('');
        setResultRemarks('');
        setSelectedFile(null);
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Résultat validé & Fichier joint !',
          description: `Les résultats de ${resultModalTest.test_name} ont été transmis au médecin.`
        });
        reload();
      } else {
        throw new Error('Erreur de mise à jour');
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur de validation',
        description: err.message || 'Une erreur est survenue lors de la sauvegarde.'
      });
    } finally {
      setSavingResult(false);
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
      icon: <Clock className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Analyses en Cours',
      value: inProgressRequests.length.toString(),
      sub: 'En traitement',
      icon: <FlaskConical className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Résultats Validés',
      value: completedRequests.length.toString(),
      sub: 'Transmis au médecin',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Analyses Urgentes',
      value: urgentRequests.length.toString(),
      sub: 'Priorité haute',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'from-red-500 to-rose-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laboratoire d'Analyses Médicales</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {user?.firstName} {user?.lastName} — gestion des demandes, téléversement de rapports PDF/Word et validation
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
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'overview', label: t('nav.overview', 'Vue d\'ensemble') },
          { id: 'requests', label: `Demandes En Attente (${pendingRequests.length})` },
          { id: 'results', label: `Résultats Validés (${completedRequests.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-3 font-semibold text-xs transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.label}
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
                  placeholder="Filtrer par nom, demandeur..."
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
              <EmptyState title="Aucune demande transmise" description="Les demandes créées par les médecins s'afficheront ici automatiquement." />
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
                          <p className="text-xs text-emerald-800 font-mono font-semibold mt-1 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                            <strong>Observations :</strong> {test.results_text}
                          </p>
                        )}
                        {test.file_url && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setPreviewFile({ url: test.file_url!, name: test.file_name || 'Rapport', type: test.file_type || '' })}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              {test.file_name || 'Voir Rapport'}
                            </button>
                            <a
                              href={test.file_url}
                              download={test.file_name || 'rapport'}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              DL
                            </a>
                          </div>
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
                          className="bg-purple-600 hover:bg-purple-700 font-bold"
                          onClick={() => {
                            setResultModalTest(test);
                            setResultText(test.results_text || '');
                            setSelectedFile(null);
                          }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Saisir & Joindre Fichier
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

      {/* RESULTS ARCHIVE */}
      {activeTab === 'results' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Historique des Analyses Validées avec Fichiers Joints</CardTitle>
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
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-950 font-mono">
                      <strong>Résultat officiel :</strong> {test.results_text}
                    </div>
                    {test.file_url && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => setPreviewFile({ url: test.file_url!, name: test.file_name || 'Rapport', type: test.file_type || '' })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Voir Rapport {test.file_name ? `(${test.file_name})` : ''}
                        </button>
                        <a
                          href={test.file_url}
                          download={test.file_name || 'rapport'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL SAISIE RÉSULTAT & TÉLÉVERSEMENT FICHIER (Z-[100] MAX-H) */}
      {resultModalTest && (
        <ModalShell
          icon={<FlaskConical className="w-6 h-6 text-purple-200" />}
          title="Saisie Résultat &amp; Fichier Rapport"
          subtitle={`Analyse : ${resultModalTest.test_name} · Demandé par : ${resultModalTest.requested_by}`}
          color="purple"
          maxWidth="lg"
          onClose={() => setResultModalTest(null)}
          zIndex={100}
          footer={
            <>
              <CancelButton onClick={() => setResultModalTest(null)} />
              <SubmitButton
                loading={savingResult}
                loadingText="Téléversement..."
                color="purple"
              >
                <Upload className="w-4 h-4" />
                Valider &amp; Transmettre au Médecin
              </SubmitButton>
            </>
          }
        >
          <form onSubmit={handleSaveResultSubmit} className="p-6 space-y-5">
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 text-purple-900 text-xs">
              <p className="font-bold text-sm text-purple-950">{resultModalTest.test_name}</p>
              <p className="mt-0.5 text-purple-700">Praticien demandeur : <strong>{resultModalTest.requested_by}</strong></p>
            </div>

            <FormField label="Observations / Résultats Textuels" required>
              <ModalTextarea
                accent="purple"
                rows={4}
                required
                placeholder="Ex: Glycémie à jeun : 0.95 g/L (Normal). Aucun germe détecté..."
                value={resultText}
                onChange={e => setResultText(e.target.value)}
              />
            </FormField>

            <FormField label="Remarques Internes (Optionnel)">
              <ModalTextarea
                accent="purple"
                rows={2}
                placeholder="Conditions de prélèvement, remarques pour le médecin..."
                value={resultRemarks}
                onChange={e => setResultRemarks(e.target.value)}
              />
            </FormField>

            <FormField label="Document / Fichier Joint (PDF, Word, Image)">
              <div className="p-4 border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-2xl text-center hover:bg-purple-50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <Paperclip className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                {selectedFile ? (
                  <div className="text-purple-900">
                    <p className="font-bold text-xs">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB — Cliquez pour changer</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-purple-900 text-xs">Cliquez ou déposez un fichier ici</p>
                    <p className="text-[10px] text-slate-400">Formats : PDF, Word (.docx), JPG, PNG</p>
                  </div>
                )}
              </div>
            </FormField>
          </form>
        </ModalShell>
      )}

      {/* Drawer Patient Profile */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}

      {/* File Lightbox */}
      {previewFile && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 p-4 animate-fade-in"
            onClick={() => setPreviewFile(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <span className="font-bold text-slate-800 text-sm">{previewFile.name}</span>
                <div className="flex gap-2">
                  <a href={previewFile.url} download={previewFile.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100">
                    <Download className="w-3.5 h-3.5" /> Télécharger
                  </a>
                  <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center min-h-0">
                {/\.(png|jpg|jpeg|gif|webp)$/i.test(previewFile.name) || previewFile.type?.startsWith('image/') ? (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-xl" />
                ) : (
                  <iframe src={previewFile.url} title={previewFile.name} className="w-full h-full min-h-[500px] border-0 rounded-xl" />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
