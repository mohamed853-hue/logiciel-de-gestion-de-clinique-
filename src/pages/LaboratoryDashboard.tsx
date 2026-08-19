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
  ModalInput,
  ModalTextarea,
  CancelButton,
  SubmitButton,
} from '../components/ModalShell';
import { 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  Search, 
  Upload, 
  Eye, 
  RefreshCw,
  X,
  Paperclip,
  Download,
  ZoomIn,
  Printer,
  TestTube,
  Package,
  FileCheck,
  Zap,
  Activity,
  Plus
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../services/supabase';
import { LabReportModal } from '../components/LabReportModal';
import type { LabTest, LabParamResult, LabReagent } from '../types';

type TabType = 'overview' | 'requests' | 'in_progress' | 'results' | 'reagents';

// Paramètres biomédicaux automatiques suggérés selon le type d'examen
const PARAMETER_TEMPLATES: Record<string, Array<{ name: string; unit: string; range: string; defaultVal?: string }>> = {
  'NFS': [
    { name: 'Leucocytes (Globules Blancs)', unit: '10³/µL', range: '4.0 - 10.0' },
    { name: 'Hématies (Globules Rouges)', unit: '10⁶/µL', range: '4.0 - 5.5' },
    { name: 'Hémoglobine (Hb)', unit: 'g/dL', range: '12.0 - 16.5' },
    { name: 'Hématocrite (Ht)', unit: '%', range: '36.0 - 48.0' },
    { name: 'VGM', unit: 'fL', range: '80.0 - 98.0' },
    { name: 'Plaquettes', unit: '10³/µL', range: '150 - 450' },
  ],
  'Glycémie': [
    { name: 'Glycémie à jeun (Plasma)', unit: 'g/L', range: '0.70 - 1.10' },
  ],
  'HbA1c': [
    { name: 'Hémoglobine Glyquée (HbA1c)', unit: '%', range: '4.0 - 6.0' },
  ],
  'Bilan Rénal': [
    { name: 'Créatininémie', unit: 'mg/L', range: '6.0 - 12.0' },
    { name: 'Urée Sanguine', unit: 'g/L', range: '0.15 - 0.45' },
    { name: 'Débit de Filtration Glomérulaire (eGFR)', unit: 'mL/min/1.73m²', range: '> 90' },
  ],
  'Bilan Hépatique': [
    { name: 'Transaminases ASAT / SGOT', unit: 'UI/L', range: '< 35' },
    { name: 'Transaminases ALAT / SGPT', unit: 'UI/L', range: '< 45' },
    { name: 'Bilirubine Totale', unit: 'mg/L', range: '< 12' },
    { name: 'Bilirubine Directe (Conjuguée)', unit: 'mg/L', range: '< 3' },
    { name: 'Phosphatases Alcalines (PAL)', unit: 'UI/L', range: '40 - 130' },
    { name: 'Gamma-GT', unit: 'UI/L', range: '< 55' },
  ],
  'CRP': [
    { name: 'Protéine C-Réactive (CRP)', unit: 'mg/L', range: '< 6.0' },
  ],
  'VS': [
    { name: 'Vitesse de Sédimentation (1ère heure)', unit: 'mm', range: '< 15' },
  ],
  'Bêta-hCG': [
    { name: 'Bêta-hCG Plasmatique', unit: 'UI/L', range: '< 5 (Non enceinte)' },
  ],
  'Paludisme': [
    { name: 'Goutte Épaisse / Frottis Mince', unit: '-', range: 'Négatif', defaultVal: 'Négatif (Absence de trophozoïtes)' },
    { name: 'Test Diagnostic Rapide (TDR Paludisme)', unit: '-', range: 'Négatif', defaultVal: 'Négatif' },
  ],
  'Widal': [
    { name: 'Sérodiagnostic Widal - Ag O', unit: 'Titre', range: '< 1/80', defaultVal: 'Négatif' },
    { name: 'Sérodiagnostic Widal - Ag H', unit: 'Titre', range: '< 1/80', defaultVal: 'Négatif' },
  ],
  'Hémostase': [
    { name: 'Taux de Prothrombine (TP)', unit: '%', range: '70 - 100' },
    { name: 'INR', unit: '-', range: '0.8 - 1.2' },
    { name: 'Temps de Céphaline Activée (TCA)', unit: 'sec', range: '28 - 38' },
  ],
  'Prééclampsie': [
    { name: 'Protéinurie des 24h', unit: 'g/24h', range: '< 0.15' },
    { name: 'Acide Urique Sanguin', unit: 'mg/L', range: '25 - 60' },
    { name: 'Plaquettes', unit: '10³/µL', range: '150 - 450' },
  ],
  'Sérologie': [
    { name: 'Antigène HBs (Hépatite B)', unit: '-', range: 'Négatif', defaultVal: 'Négatif' },
    { name: 'Sérologie VIH 1 & 2', unit: '-', range: 'Négatif', defaultVal: 'Négatif' },
    { name: 'Sérologie Syphilis (TPHA/VDRL)', unit: '-', range: 'Négatif', defaultVal: 'Négatif' },
  ]
};

// Stock réactifs initiaux par défaut
const DEFAULT_REAGENTS: LabReagent[] = [
  { id: '1', name: 'Tubes EDTA K3 (Bouchon Violet 4mL)', category: 'Tubes & Prélèvements', quantity: 240, unit: 'tubes', min_threshold: 50, status: 'optimal' },
  { id: '2', name: 'Tubes Secs avec Activateur (Bouchon Rouge 5mL)', category: 'Tubes & Prélèvements', quantity: 180, unit: 'tubes', min_threshold: 40, status: 'optimal' },
  { id: '3', name: 'Tubes Citrate de Sodium (Bouchon Bleu 3mL)', category: 'Hémostase', quantity: 65, unit: 'tubes', min_threshold: 30, status: 'optimal' },
  { id: '4', name: 'Tubes Héparinate de Lithium (Bouchon Vert)', category: 'Biochimie', quantity: 25, unit: 'tubes', min_threshold: 30, status: 'warning' },
  { id: '5', name: 'Bandelettes Urinaires 10 Paramètres', category: 'Uro-chimie', quantity: 80, unit: 'tests', min_threshold: 25, status: 'optimal' },
  { id: '6', name: 'Tests Rapides Paludisme (TDR Pf/Pan)', category: 'Parasitologie', quantity: 120, unit: 'tests', min_threshold: 35, status: 'optimal' },
  { id: '7', name: 'Tests de Grossesse Rapides Bêta-hCG', category: 'Hormonologie', quantity: 95, unit: 'tests', min_threshold: 20, status: 'optimal' },
  { id: '8', name: 'Kit Réactif Sérodiagnostic de Widal & Félix', category: 'Sérologie', quantity: 12, unit: 'flacons', min_threshold: 5, status: 'optimal' },
  { id: '9', name: 'Écouvillons Stériles Prélèvement Vaginal', category: 'Bactériologie', quantity: 15, unit: 'écouvillons', min_threshold: 20, status: 'warning' },
  { id: '10', name: 'Lames de Microscopie Dépolies', category: 'Consommables', quantity: 300, unit: 'lames', min_threshold: 100, status: 'optimal' },
];

export function LaboratoryDashboard() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Modal Saisie Résultat Structuré & Fichier Joint
  const [resultModalTest, setResultModalTest] = useState<LabTest | null>(null);
  const [structuredParams, setStructuredParams] = useState<LabParamResult[]>([]);
  const [resultText, setResultText] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

  // Modal Impression Officielle Compte-Rendu
  const [printModalTest, setPrintModalTest] = useState<LabTest | null>(null);

  // Réactifs
  const [reagents, setReagents] = useState<LabReagent[]>(() => {
    try {
      const saved = localStorage.getItem('al_shifa_lab_reagents');
      return saved ? JSON.parse(saved) : DEFAULT_REAGENTS;
    } catch {
      return DEFAULT_REAGENTS;
    }
  });

  const { labTests, loading, reload, updateResult, updateSampleStatus } = useLabRequests({ limit: 150 });

  // Écouteur navigation globale
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'requests' || path === '/dashboard/requests') setActiveTab('requests');
      else if (path === 'results' || path === '/dashboard/results') setActiveTab('results');
      else if (path === 'reagents') setActiveTab('reagents');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  // Sauvegarde des réactifs
  const updateReagentQty = (id: string, delta: number) => {
    setReagents(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const newQty = Math.max(0, r.quantity + delta);
          let newStatus: LabReagent['status'] = 'optimal';
          if (newQty === 0) newStatus = 'critical';
          else if (newQty <= r.min_threshold) newStatus = 'warning';
          return { ...r, quantity: newQty, status: newStatus };
        }
        return r;
      });
      localStorage.setItem('al_shifa_lab_reagents', JSON.stringify(updated));
      return updated;
    });
  };

  // Préparation du modal de saisie structuré
  const openResultModal = (test: LabTest) => {
    setResultModalTest(test);
    setResultText(test.results_text || '');
    setResultRemarks(test.remarks || '');
    setSelectedFile(null);

    // Initialisation des paramètres structurés
    if (test.structured_results && test.structured_results.length > 0) {
      setStructuredParams(test.structured_results);
    } else {
      let matchedParams: LabParamResult[] = [];
      const testUpper = test.test_name.toUpperCase();

      for (const [key, tplList] of Object.entries(PARAMETER_TEMPLATES)) {
        if (testUpper.includes(key.toUpperCase())) {
          matchedParams = tplList.map(t => ({
            param_name: t.name,
            value: t.defaultVal || '',
            unit: t.unit,
            reference_range: t.range,
            status: 'normal',
          }));
          break;
        }
      }

      if (matchedParams.length === 0) {
        matchedParams = [{
          param_name: test.test_name,
          value: '',
          unit: '',
          reference_range: 'Normal',
          status: 'normal',
        }];
      }
      setStructuredParams(matchedParams);
    }
  };

  const handleSaveResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModalTest) return;

    setSavingResult(true);
    let attachmentObj: { file_url: string; file_name?: string; file_type?: string; file_size?: number } | undefined = undefined;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const cleanFileName = `result_${resultModalTest.id}_${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('lab-results')
          .upload(cleanFileName, selectedFile, { upsert: true });

        if (uploadErr) {
          console.error('Storage upload error:', uploadErr);
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

      let autoSummary = resultText.trim();
      if (!autoSummary && structuredParams.length > 0) {
        autoSummary = structuredParams
          .filter(p => p.value !== '')
          .map(p => `${p.param_name} : ${p.value} ${p.unit || ''} (${p.status === 'normal' ? 'Normal' : 'Anormal'})`)
          .join('\n');
      }

      const success = await updateResult(
        resultModalTest.id,
        autoSummary || 'Résultats validés par le biologiste.',
        `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Laboratoire Biologie Clinique',
        attachmentObj,
        structuredParams,
        resultRemarks.trim() || undefined
      );

      if (success) {
        try {
          await supabase.from('notifications').insert([{
            recipient_role: 'medecin',
            type: 'lab_result',
            title: '🧪 Résultats d\'analyse validés',
            message: `Résultats validés pour ${resultModalTest.test_name}`,
            entity_type: 'lab_test',
            entity_id: resultModalTest.id,
            is_read: false,
          }]);
        } catch { /* silent */ }

        setResultModalTest(null);
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Résultat Validé & Transmis !',
          description: `Le compte-rendu pour ${resultModalTest.test_name} est désormais accessible au médecin traitant.`
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
  const inProgressRequests = labTests.filter(l => l.status === 'en_cours' || l.status === 'preleve');
  const completedRequests = labTests.filter(l => l.status === 'termine');
  const urgentRequests = labTests.filter(l => l.urgence && l.status !== 'termine');

  const filteredTests = labTests.filter(l =>
    !searchQuery ||
    l.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.requested_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.clinical_indication?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    {
      title: 'Demandes en Attente',
      value: pendingRequests.length.toString(),
      sub: 'À prélever / traiter',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Échantillons & En Cours',
      value: inProgressRequests.length.toString(),
      sub: 'En automate / paillasse',
      icon: <TestTube className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Bulletins Validés',
      value: completedRequests.length.toString(),
      sub: 'Signés & Transmis',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Urgences Laboratoire',
      value: urgentRequests.length.toString(),
      sub: 'Priorité vitale',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-red-500 to-rose-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800">{t('lab.title', 'Laboratoire de Biologie Médicale')}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
              {t('app.title', 'Al Shifa')}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            {user?.firstName} {user?.lastName} — {isArabic ? 'سحب العينات، التحاليل الآلية، اعتماد التقارير الطبية وطباعتها' : 'Prélèvement, automates biomédicaux, validation structurée et émission de bulletins A4'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh', 'Actualiser')}
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
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'overview', label: `${t('nav.overview', 'Vue Globale')} (${filteredTests.length})`, icon: <Activity className="w-3.5 h-3.5 mr-1" /> },
          { id: 'requests', label: `${t('nav.requests', 'Demandes à Prélever')} (${pendingRequests.length})`, icon: <Clock className="w-3.5 h-3.5 mr-1" /> },
          { id: 'in_progress', label: `${t('lab.in_progress', 'Échantillons en Automate')} (${inProgressRequests.length})`, icon: <TestTube className="w-3.5 h-3.5 mr-1" /> },
          { id: 'results', label: `${t('nav.results', 'Bulletins Validés')} (${completedRequests.length})`, icon: <FileCheck className="w-3.5 h-3.5 mr-1" /> },
          { id: 'reagents', label: `${t('lab.reagents_stock', 'Stock Réactifs & Consommables')} (${reagents.length})`, icon: <Package className="w-3.5 h-3.5 mr-1" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-3 font-bold text-xs transition-colors border-b-2 -mb-px flex items-center whitespace-nowrap cursor-pointer',
              activeTab === tab.id
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1 & 2 & 3 : LISTE DES DEMANDES AVEC CYCLE DE VIE ───────────────── */}
      {(activeTab === 'overview' || activeTab === 'requests' || activeTab === 'in_progress') && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-base">
                {activeTab === 'requests'
                  ? 'Demandes en Attente de Prélèvement'
                  : activeTab === 'in_progress'
                  ? 'Échantillons Prévus & Analyses en Cours de Traitement'
                  : 'Toutes les Prescriptions d\'Analyses'}
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none w-64 bg-white"
                  placeholder="Filtrer par analyse, praticien, motif..."
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
              <EmptyState title="Aucune analyse trouvée" description="Les prescriptions créées par les médecins et gynécologues s'afficheront ici automatiquement." />
            ) : (
              <div className="space-y-3">
                {filteredTests
                  .filter(test => {
                    if (activeTab === 'requests') return test.status === 'en_attente';
                    if (activeTab === 'in_progress') return test.status === 'preleve' || test.status === 'en_cours';
                    return true;
                  })
                  .map((test) => (
                    <div
                      key={test.id}
                      className={cn(
                        'p-4 rounded-2xl border transition-all flex items-center justify-between flex-wrap gap-3',
                        test.urgence && test.status !== 'termine'
                          ? 'bg-red-50/50 border-red-200 shadow-xs'
                          : 'bg-white hover:bg-purple-50/30 border-slate-200/80'
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-sm',
                          test.status === 'termine' ? 'bg-emerald-100 text-emerald-700' :
                          test.status === 'preleve' || test.status === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        )}>
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-slate-800 text-sm">{test.test_name}</p>
                            {test.urgence && (
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                                🚨 URGENT
                              </span>
                            )}
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-black',
                              test.status === 'termine' ? 'bg-emerald-100 text-emerald-800' :
                              test.status === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                              test.status === 'preleve' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-amber-100 text-amber-800'
                            )}>
                              {test.status === 'termine' ? '✓ Validé' :
                               test.status === 'en_cours' ? '⚙️ En Automate' :
                               test.status === 'preleve' ? '🩸 Tube Prélevé' :
                               '⏳ En Attente'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>Prescrit par : <strong className="text-slate-700">{test.requested_by}</strong></span>
                            {test.clinical_indication && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-800 font-bold rounded-md border border-purple-100">
                                Motif : {test.clinical_indication}
                              </span>
                            )}
                            {test.patient_fasting !== undefined && (
                              <span className={cn('text-[11px] font-semibold', test.patient_fasting ? 'text-emerald-700' : 'text-slate-500')}>
                                {test.patient_fasting ? '✓ À jeun' : 'Non à jeun'}
                              </span>
                            )}
                            {test.gestational_age_sa && (
                              <span className="text-pink-700 font-bold bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                                🤰 {test.gestational_age_sa}
                              </span>
                            )}
                          </div>

                          {test.structured_results && test.structured_results.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {test.structured_results.map((p, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-[10px] font-mono">
                                  <strong>{p.param_name}:</strong> {p.value} {p.unit || ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS SELON CYCLE DE VIE */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {test.patient_id && (
                          <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(test.patient_id)}>
                            <Eye className="w-4 h-4 mr-1 text-blue-600" /> Patient
                          </Button>
                        )}

                        {test.status === 'en_attente' && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                            onClick={() => updateSampleStatus(test.id, 'preleve')}
                          >
                            <TestTube className="w-3.5 h-3.5 mr-1" /> Tube Prélevé
                          </Button>
                        )}

                        {test.status === 'preleve' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                            onClick={() => updateSampleStatus(test.id, 'en_cours')}
                          >
                            <Activity className="w-3.5 h-3.5 mr-1" /> Lancer Analyse
                          </Button>
                        )}

                        {test.status !== 'termine' && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-sm"
                            onClick={() => openResultModal(test)}
                          >
                            <Upload className="w-3.5 h-3.5 mr-1" /> Saisir &amp; Valider
                          </Button>
                        )}

                        {test.status === 'termine' && (
                          <Button
                            size="sm"
                            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold cursor-pointer"
                            onClick={() => setPrintModalTest(test)}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1 text-purple-700" /> Bulletin A4
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

      {/* ─── TAB 4 : BULLETINS VALIDÉS & ARCHIVES ─────────────────────────────── */}
      {activeTab === 'results' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Historique des Comptes-Rendus Validés &amp; Certifiés</CardTitle>
          </CardHeader>
          <CardContent>
            {completedRequests.length === 0 ? (
              <EmptyState title="Aucun résultat archivé" description="Les examens validés s'archiveront automatiquement ici." />
            ) : (
              <div className="space-y-3">
                {completedRequests.map((test) => (
                  <div key={test.id} className="p-4 rounded-2xl border border-slate-200 bg-white text-xs space-y-3 shadow-xs">
                    <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm">{test.test_name}</span>
                        <span className="ml-2 font-mono text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          #{test.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="termine" />
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                          onClick={() => setPrintModalTest(test)}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimer Bulletin
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-500">
                      <div>Demandeur : <strong className="text-slate-800">{test.requested_by}</strong></div>
                      <div>Validé par : <strong className="text-purple-900">{test.validated_by || 'Laboratoire'}</strong></div>
                      <div>Date : <strong className="text-slate-700">{new Date(test.validated_at || test.created_at).toLocaleString('fr-FR')}</strong></div>
                    </div>

                    {test.structured_results && test.structured_results.length > 0 && (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
                            <tr>
                              <th className="py-1.5 px-3 text-left">Paramètre</th>
                              <th className="py-1.5 px-2 text-center">Valeur</th>
                              <th className="py-1.5 px-2 text-center">Normes</th>
                              <th className="py-1.5 px-3 text-right">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {test.structured_results.map((p, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 px-3 font-semibold text-slate-800">{p.param_name}</td>
                                <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900">{p.value} {p.unit || ''}</td>
                                <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">{p.reference_range || '-'}</td>
                                <td className="py-1.5 px-3 text-right">
                                  <span className={cn(
                                    'px-1.5 py-0.5 rounded text-[9px] font-black',
                                    p.status === 'high' || p.status === 'low' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                  )}>
                                    {p.status === 'high' ? '▲ ÉLEVÉ' : p.status === 'low' ? '▼ BAS' : '✓ NORMAL'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {test.file_url && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => setPreviewFile({ url: test.file_url!, name: test.file_name || 'Rapport', type: test.file_type || '' })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Voir Fichier Joint ({test.file_name || 'Document'})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 5 : STOCK DES RÉACTIFS & TUBES DE PRÉLÈVEMENT ──────────────────── */}
      {activeTab === 'reagents' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">Inventaire des Réactifs &amp; Consommables de Laboratoire</CardTitle>
                <p className="text-xs text-slate-500">Suivi en temps réel des tubes de prélèvement, réactifs d'automates et bandelettes</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reagents.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3',
                    item.status === 'critical' ? 'border-red-400 bg-red-50/50' :
                    item.status === 'warning' ? 'border-amber-400 bg-amber-50/40' :
                    'border-slate-200 bg-white'
                  )}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.category}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                        item.status === 'critical' ? 'bg-red-600 text-white' :
                        item.status === 'warning' ? 'bg-amber-600 text-white' :
                        'bg-emerald-100 text-emerald-800'
                      )}>
                        {item.status === 'critical' ? 'Rupture' : item.status === 'warning' ? 'Alerte Seuil' : 'Optimal'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Seuil minimum d'alerte : {item.min_threshold} {item.unit}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black text-slate-900 font-mono">{item.quantity}</span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">{item.unit}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateReagentQty(item.id, -5)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReagentQty(item.id, 10)}
                        className="w-7 h-7 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-black flex items-center justify-center text-xs cursor-pointer"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL SAISIE STRUCTURÉE DES RÉSULTATS ────────────────────────────── */}
      {resultModalTest && (
        <ModalShell
          icon={<FlaskConical className="w-6 h-6 text-purple-200" />}
          title="Saisie Structurée des Résultats d'Analyses"
          subtitle={`Examen : ${resultModalTest.test_name} · Prescripteur : ${resultModalTest.requested_by}`}
          color="purple"
          maxWidth="2xl"
          onClose={() => setResultModalTest(null)}
          zIndex={100}
          footer={
            <>
              <CancelButton onClick={() => setResultModalTest(null)} />
              <SubmitButton
                loading={savingResult}
                loadingText="Validation en cours..."
                color="purple"
                onClick={handleSaveResultSubmit}
                form="lab-result-form"
              >
                <CheckCircle className="w-4 h-4" />
                Valider &amp; Émettre le Bulletin Officiel
              </SubmitButton>
            </>
          }
        >
          <form id="lab-result-form" onSubmit={handleSaveResultSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Info prescription */}
            <div className="p-3.5 bg-gradient-to-r from-purple-50 to-pink-50/30 rounded-2xl border border-purple-100 text-xs">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <p className="font-extrabold text-sm text-purple-950">{resultModalTest.test_name}</p>
                  <p className="text-slate-500 mt-0.5">Praticien demandeur : <strong>{resultModalTest.requested_by}</strong></p>
                </div>
                {resultModalTest.clinical_indication && (
                  <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-bold text-[11px]">
                    Motif : {resultModalTest.clinical_indication}
                  </span>
                )}
              </div>
            </div>

            {/* Tableau de saisie des paramètres structurés */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Paramètres Biologiques &amp; Valeurs Mesurées
                </label>
                <button
                  type="button"
                  onClick={() => setStructuredParams([...structuredParams, { param_name: '', value: '', unit: '', reference_range: '', status: 'normal' }])}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un paramètre
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[9.5px] font-extrabold">
                    <tr>
                      <th className="py-2 px-3 text-left">Paramètre</th>
                      <th className="py-2 px-2 text-center">Valeur</th>
                      <th className="py-2 px-2 text-center">Unités</th>
                      <th className="py-2 px-2 text-center">Normes</th>
                      <th className="py-2 px-2 text-center">Statut</th>
                      <th className="py-2 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {structuredParams.map((param, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={param.param_name}
                            onChange={e => {
                              const copy = [...structuredParams];
                              copy[index].param_name = e.target.value;
                              setStructuredParams(copy);
                            }}
                            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-purple-500"
                            placeholder="Nom du paramètre"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <input
                            type="text"
                            value={param.value}
                            onChange={e => {
                              const copy = [...structuredParams];
                              copy[index].value = e.target.value;
                              setStructuredParams(copy);
                            }}
                            className="w-full text-xs font-mono font-black text-center text-purple-950 bg-purple-50/60 border border-purple-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="Mesure"
                            required
                          />
                        </td>
                        <td className="p-2 w-20">
                          <input
                            type="text"
                            value={param.unit || ''}
                            onChange={e => {
                              const copy = [...structuredParams];
                              copy[index].unit = e.target.value;
                              setStructuredParams(copy);
                            }}
                            className="w-full text-[11px] font-mono text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none"
                            placeholder="Unités"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <input
                            type="text"
                            value={param.reference_range || ''}
                            onChange={e => {
                              const copy = [...structuredParams];
                              copy[index].reference_range = e.target.value;
                              setStructuredParams(copy);
                            }}
                            className="w-full text-[11px] font-mono text-center text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none"
                            placeholder="Ref."
                          />
                        </td>
                        <td className="p-2 w-28">
                          <select
                            value={param.status || 'normal'}
                            onChange={e => {
                              const copy = [...structuredParams];
                              copy[index].status = e.target.value as any;
                              setStructuredParams(copy);
                            }}
                            className={cn(
                              'w-full text-[10.5px] font-black rounded-lg p-1.5 outline-none border cursor-pointer',
                              param.status === 'high' || param.status === 'critical' ? 'bg-red-50 text-red-800 border-red-300' :
                              param.status === 'low' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              'bg-emerald-50 text-emerald-800 border-emerald-300'
                            )}
                          >
                            <option value="normal">✓ Normal</option>
                            <option value="high">▲ Élevé</option>
                            <option value="low">▼ Bas</option>
                            <option value="critical">🚨 Critique</option>
                            <option value="positive">Positif</option>
                            <option value="negative">Négatif</option>
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => setStructuredParams(structuredParams.filter((_, i) => i !== index))}
                            className="text-slate-400 hover:text-red-600 font-bold p-1"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observations textuelles */}
            <FormField label="Conclusion &amp; Observations Médicales du Biologiste">
              <ModalTextarea
                accent="purple"
                rows={3}
                placeholder="Conclusion diagnostique, conseils au praticien, aspect du sérum..."
                value={resultText}
                onChange={e => setResultText(e.target.value)}
              />
            </FormField>

            {/* Remarques techniques */}
            <FormField label="Remarques Internes / Conditions d'Analyse (Optionnel)">
              <ModalInput
                accent="purple"
                placeholder="Automate utilisé, contrôle qualité validé..."
                value={resultRemarks}
                onChange={e => setResultRemarks(e.target.value)}
              />
            </FormField>

            {/* Pièce jointe optionnelle */}
            <FormField label="Document Annexe (PDF, Image, Rapport d'Automate)">
              <div className="p-3 border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-2xl text-center hover:bg-purple-50 transition-colors cursor-pointer relative">
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
                <Paperclip className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                {selectedFile ? (
                  <div className="text-purple-900">
                    <p className="font-bold text-xs">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB — Prêt à être joint</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-purple-900 text-xs">Déposer un fichier annexe (PDF / Image)</p>
                    <p className="text-[10px] text-slate-400">Formats supportés : PDF, Word, JPG, PNG</p>
                  </div>
                )}
              </div>
            </FormField>
          </form>
        </ModalShell>
      )}

      {/* ─── MODAL BULLETIN OFFICIEL A4 PRÊT À L'IMPRESSION ───────────────────── */}
      {printModalTest && (
        <LabReportModal
          test={printModalTest}
          onClose={() => setPrintModalTest(null)}
        />
      )}

      {/* Drawer Profil Patient */}
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
                  <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
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
