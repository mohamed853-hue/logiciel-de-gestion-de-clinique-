import { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Check, 
  AlertCircle, 
  Zap, 
  Baby, 
  Sparkles, 
  Stethoscope,
  Layers,
  Search,
  Plus
} from 'lucide-react';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types';
import {
  ModalShell,
  FormSection,
  FormField,
  ModalInput,
  ModalTextarea,
  CancelButton,
  SubmitButton,
  ModalErrorAlert,
} from './ModalShell';
import { cn } from '../utils/cn';

interface LabRequestFormProps {
  patient: Patient;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── BILANS TYPES CLINIQUES (PACKS MULTI-TESTS EN 1 CLIC) ──────────────────────
interface ClinicalPackage {
  id: string;
  name: string;
  category: 'gyneco' | 'general' | 'emergency' | 'metabolic';
  description: string;
  badge: string;
  badgeColor: string;
  tests: string[];
  defaultIndication: string;
  defaultSample: string;
  requiresFasting?: boolean;
}

const CLINICAL_PACKAGES: ClinicalPackage[] = [
  {
    id: 'cpn1',
    name: 'Bilan Prénatal CPN 1 (1er Trimestre Complet)',
    category: 'gyneco',
    badge: '🤰 Gynéco / Obstétrique',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    description: 'Bilan légal obligatoire : Groupe/Rhésus, RAI, NFS, Glycémie, Sérologies Toxo/Rubéole/VIH/Syphilis/Hépatite B, Albuminurie',
    tests: [
      'Groupage Sanguin ABO / Facteur Rhésus',
      'Recherche d\'Agglutinines Irrégulières (RAI)',
      'NFS / Hémogramme Complet',
      'Glycémie à jeun',
      'Sérologie Toxoplasmose (IgG + IgM)',
      'Sérologie Rubéole (IgG)',
      'Sérologie Syphilis (TPHA / VDRL)',
      'Sérologie VIH 1 & 2 (Dépistage)',
      'Antigène HBs (Hépatite B)',
      'Bandelette Urinaire (Protéinurie / Glycosurie)'
    ],
    defaultIndication: 'Bilan Prénatal Obligatoire CPN 1 (Suivi de grossesse 1er trimestre)',
    defaultSample: 'Sang veineux + Urines',
    requiresFasting: true
  },
  {
    id: 'preeclampsie',
    name: 'Bilan Toxémie & Prééclampsie Sévère',
    category: 'gyneco',
    badge: '🚨 Urgence Obstétricale',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    description: 'Recherche de complications materno-fœtales : Protéinurie des 24h, Acide urique, NFS/Plaquettes, Transaminases, Créatinine',
    tests: [
      'Protéinurie des 24h (Dosage quantitatif)',
      'NFS avec numération des Plaquettes',
      'Transaminases Hépatiques (ASAT / ALAT)',
      'Créatininémie & Clairance',
      'Acide Urique Sanguin',
      'LDH & Bilan d\'hémolyse'
    ],
    defaultIndication: 'Suspicion ou surveillance de Prééclampsie / HTA gravidique',
    defaultSample: 'Sang veineux + Urines des 24h',
    requiresFasting: false
  },
  {
    id: 'bhcg_follow',
    name: 'Dosage Bêta-hCG Plasmatique Quantitatif',
    category: 'gyneco',
    badge: '👶 Grossesse & GEU',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Confirmation de grossesse évolutive, datation précise ou élimination de GEU (Grossesse Extra-Utérine)',
    tests: [
      'Bêta-hCG Plasmatique Quantitatif (UI/L)',
      'Groupage Sanguin (si saignements)'
    ],
    defaultIndication: 'Diagnostic de début de grossesse / suspicion de GEU / saignements T1',
    defaultSample: 'Sang veineux',
    requiresFasting: false
  },
  {
    id: 'vaginal_infection',
    name: 'Bilan Gynéco & Prélèvement Vaginal (Pertes / Leucorrhées)',
    category: 'gyneco',
    badge: '🌸 Gynécologie Médicale',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Examen direct, coloration Gram, culture et antibiogramme (Mycoses, Vaginose Gardnerella, Trichomonas, Streptocoque B)',
    tests: [
      'Prélèvement Vaginal (Examen Direct + Culture)',
      'Recherche Streptocoque du Groupe B (Pré-partum)',
      'Recherche Chlamydia Trachomatis & Mycoplasmes',
      'ECBU (Examen Cytobactériologique des Urines)'
    ],
    defaultIndication: 'Leucorrhées pathologiques, prurit vulvaire, dépistage avant accouchement',
    defaultSample: 'Prélèvement vaginal sur écouvillon + Urines',
    requiresFasting: false
  },
  {
    id: 'infectious_fever',
    name: 'Bilan Infectieux & Syndrome Fébril Inexpliqué',
    category: 'general',
    badge: '🔥 Médecine / Urgences',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'NFS, CRP ultra-sensible, Vitesse de sédimentation, Goutte épaisse / TDR Paludisme, Sérodiagnostic de Widal',
    tests: [
      'NFS / Hémogramme Complet',
      'CRP (Protéine C-Réactive)',
      'Vitesse de Sédimentation (VS)',
      'Goutte Épaisse & Frottis Mince (Paludisme)',
      'TDR Paludisme (Test Rapide)',
      'Sérodiagnostic de Widal & Félix (Fièvre Typhoïde)'
    ],
    defaultIndication: 'Syndrome infectieux aigu / Fièvre inexpliquée / Suspicion Paludisme',
    defaultSample: 'Sang veineux',
    requiresFasting: false
  },
  {
    id: 'diabetes_metabolic',
    name: 'Bilan Métabolique, Diabète & Risque Cardiovasculaire',
    category: 'metabolic',
    badge: '🍬 Métabolisme & Diabète',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Glycémie à jeun, HbA1c, Cholestérol Total, HDL, LDL, Triglycérides, Bilan Rénal (Urée/Créat)',
    tests: [
      'Glycémie à jeun',
      'Hémoglobine Glyquée (HbA1c)',
      'Bilan Lipidique Complet (Cholestérol, HDL, LDL, Triglycérides)',
      'Créatininémie + eGFR',
      'Urée Sanguine',
      'Microalbuminurie Urinaire'
    ],
    defaultIndication: 'Bilan annuel diabète de type 2 / Dépistage dyslipidémie & risque CV',
    defaultSample: 'Sang veineux',
    requiresFasting: true
  },
  {
    id: 'preop_hemostasis',
    name: 'Bilan Pré-opératoire & Hémostase Standard',
    category: 'general',
    badge: '🩺 Chirurgie & Préop',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Bilan hémostase, Groupage complet avec RAI, NFS et fonction rénale avant intervention ou accouchement',
    tests: [
      'Taux de Prothrombine (TP / INR)',
      'Temps de Céphaline Activée (TCA / TCK)',
      'Groupage Sanguin ABO / Rhésus (2 déterminations)',
      'Recherche d\'Agglutinines Irrégulières (RAI)',
      'NFS avec numération plaquettaire',
      'Créatininémie'
    ],
    defaultIndication: 'Bilan d\'hémostase et de sécurité préopératoire / Pré-césarienne',
    defaultSample: 'Sang veineux (Tube Citrate + EDTA + Sec)',
    requiresFasting: false
  },
  {
    id: 'liver_digestive',
    name: 'Bilan Hépatique & Fonctionnel Complet',
    category: 'general',
    badge: '🫁 Hépato-Gastro',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    description: 'Transaminases (ASAT/ALAT), Bilirubine Totale/Conjuguée, Phosphatases Alcalines, Gamma-GT',
    tests: [
      'Transaminases ASAT / SGOT',
      'Transaminases ALAT / SGPT',
      'Bilirubine Totale & Directe (Conjuguée)',
      'Phosphatases Alcalines (PAL)',
      'Gamma-Glutamyl Transférase (GGT)'
    ],
    defaultIndication: 'Ictère, cytolyse ou cholestase hépatique / Surveillance traitement hépatotoxique',
    defaultSample: 'Sang veineux',
    requiresFasting: true
  }
];

// ─── CATALOGUE D'ANALYSES INDIVIDUELLES ────────────────────────────────────────
const INDIVIDUAL_TESTS = [
  { name: 'NFS / Hémogramme Complet', category: 'Hématologie', icon: '🩸' },
  { name: 'Taux de Prothrombine (TP / INR)', category: 'Hémostase', icon: '⏱️' },
  { name: 'TCA / TCK (Hémostase)', category: 'Hémostase', icon: '⏱️' },
  { name: 'Groupage Sanguin (ABO / Rhésus)', category: 'Immuno-Hématologie', icon: '🅰️' },
  { name: 'RAI (Agglutinines Irrégulières)', category: 'Immuno-Hématologie', icon: '🧬' },
  { name: 'Glycémie à jeun', category: 'Biochimie', icon: '🍬' },
  { name: 'Hémoglobine Glyquée (HbA1c)', category: 'Biochimie', icon: '📊' },
  { name: 'Urée Sanguine', category: 'Biochimie', icon: '🫘' },
  { name: 'Créatininémie + Débit de Filtration', category: 'Biochimie', icon: '🫘' },
  { name: 'Ionogramme Sanguin (Na, K, Cl)', category: 'Biochimie', icon: '⚡' },
  { name: 'Acide Urique', category: 'Biochimie', icon: '🧪' },
  { name: 'Transaminases (ASAT / ALAT)', category: 'Biochimie', icon: '🫁' },
  { name: 'Bilirubine Totale & Directe', category: 'Biochimie', icon: '🫁' },
  { name: 'Cholestérol Total + HDL + LDL + Triglycérides', category: 'Biochimie', icon: '🥑' },
  { name: 'CRP (Protéine C-Réactive)', category: 'Inflammation', icon: '🔥' },
  { name: 'Vitesse de Sédimentation (VS)', category: 'Inflammation', icon: '⏳' },
  { name: 'Goutte Épaisse / Frottis (Paludisme)', category: 'Parasitologie', icon: '🦟' },
  { name: 'Sérodiagnostic de Widal (Typhoïde)', category: 'Sérologie', icon: '🌡️' },
  { name: 'Sérologie VIH 1 & 2 (Dépistage Rapide/Elisa)', category: 'Sérologie', icon: '🛡️' },
  { name: 'Antigène HBs (Hépatite B)', category: 'Sérologie', icon: '💉' },
  { name: 'Sérologie Hépatite C (Ac Anti-VHC)', category: 'Sérologie', icon: '💉' },
  { name: 'Sérologie Toxoplasmose (IgG / IgM)', category: 'Sérologie / CPN', icon: '🐱' },
  { name: 'Sérologie Rubéole (IgG)', category: 'Sérologie / CPN', icon: '👶' },
  { name: 'Sérologie Syphilis (TPHA / VDRL)', category: 'Sérologie / CPN', icon: '🔬' },
  { name: 'Bêta-hCG Plasmatique Quantitatif', category: 'Hormonologie', icon: '🤱' },
  { name: 'Bilan Thyroïdien (TSH ultra-sensible / FT4)', category: 'Hormonologie', icon: '🦋' },
  { name: 'Bilan Hormonal (FSH, LH, Prolactine, Œstradiol)', category: 'Hormonologie', icon: '🌸' },
  { name: 'ECBU (Examen Cytobactériologique Urines)', category: 'Bactériologie', icon: '🧪' },
  { name: 'Bandelette Urinaire (Protéines, Sucre, Nitrites)', category: 'Bactériologie', icon: '🧻' },
  { name: 'Protéinurie des 24h', category: 'Biochimie / Gynéco', icon: '🧪' },
  { name: 'Prélèvement Vaginal (Direct + Culture + Antibiogramme)', category: 'Bactériologie / Gynéco', icon: '🌸' },
  { name: 'Frottis Cervico-Vaginal (FCV)', category: 'Cytologie', icon: '🔬' },
];

const COMMON_INDICATIONS = [
  'Bilan Prénatal CPN 1 (1er Trimestre)',
  'Bilan Prénatal CPN 2 / 3 (Suivi de Grossesse)',
  'Suspicion de Toxémie / Prééclampsie Gravidique',
  'Suspicion Syndrome Infectieux / Paludisme / Typhoïde',
  'Bilan de Diabète / Surveillance Glycémique',
  'Bilan HTA & Risque Cardiovasculaire',
  'Bilan Pré-opératoire & Hémostase',
  'Leucorrhées Pathologiques / Prélèvement Vaginal',
  'Douleurs Pelviennes / Suspicion GEU',
  'Bilan de Santé de Routine / Bilan Général',
];

export function LabRequestForm({ patient, onClose, onSuccess }: LabRequestFormProps) {
  const { user } = useAuth();
  const { createLabRequest } = useLabRequests();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'packages' | 'individual'>('packages');

  // Sélections
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [searchTest, setSearchTest] = useState('');
  
  // Contexte clinique riche
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [patientFasting, setPatientFasting] = useState<boolean>(true);
  const [onAntibiotics, setOnAntibiotics] = useState<boolean>(false);
  const [gestationalAgeSa, setGestationalAgeSa] = useState<string>(
    patient.pregnancy_weeks ? `${patient.pregnancy_weeks} SA` : (patient.pregnancy_months ? `${Number(patient.pregnancy_months) * 4} SA` : '')
  );
  const [sampleType, setSampleType] = useState('Sang veineux (Tube EDTA / Sec)');
  const [errorMsg, setErrorMsg] = useState('');

  const isFemaleOrPregnant = patient.sex === 'F' || patient.is_pregnant || user?.role === 'gynecologue';

  // Toggle ou ajout d'un test
  const toggleTest = (testName: string) => {
    if (selectedTests.includes(testName)) {
      setSelectedTests(selectedTests.filter(t => t !== testName));
    } else {
      setSelectedTests([...selectedTests, testName]);
    }
  };

  // Appliquer un pack clinique complet
  const applyPackage = (pkg: ClinicalPackage) => {
    const combined = Array.from(new Set([...selectedTests, ...pkg.tests]));
    setSelectedTests(combined);
    if (!clinicalIndication) {
      setClinicalIndication(pkg.defaultIndication);
    }
    if (pkg.requiresFasting !== undefined) {
      setPatientFasting(pkg.requiresFasting);
    }
    if (pkg.defaultSample) {
      setSampleType(pkg.defaultSample);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customTest.trim();
    if (trimmed && !selectedTests.includes(trimmed)) {
      setSelectedTests([...selectedTests, trimmed]);
      setCustomTest('');
    }
  };

  const filteredIndividualTests = useMemo(() => {
    return INDIVIDUAL_TESTS.filter(t => 
      !searchTest || 
      t.name.toLowerCase().includes(searchTest.toLowerCase()) || 
      t.category.toLowerCase().includes(searchTest.toLowerCase())
    );
  }, [searchTest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      setErrorMsg('Veuillez sélectionner au moins une analyse biologique ou un bilan type.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await createLabRequest({
      patient_id: patient.id,
      doctor_id: user?.id,
      doctor_name: `Dr. ${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Praticien Prescripteur',
      tests: selectedTests.map(t => ({ name: t })),
      urgence: isUrgent,
      clinical_indication: clinicalIndication.trim() || undefined,
      clinical_notes: clinicalNotes.trim() || undefined,
      patient_fasting: patientFasting,
      on_antibiotics: onAntibiotics,
      gestational_age_sa: isFemaleOrPregnant ? gestationalAgeSa : undefined,
      sample_type: sampleType,
    });

    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de la transmission de la prescription');
    }
  };

  const patientName = `${patient.first_name} ${patient.last_name || patient.name}`;

  return (
    <ModalShell
      icon={<FlaskConical className="w-6 h-6 text-purple-200" />}
      title="Prescription d'Analyses de Biologie Médicale"
      subtitle={`Dossier Médical · ${patientName} (${patient.age ? `${patient.age} ans` : 'Âge N/R'})`}
      color="purple"
      maxWidth="2xl"
      level={2}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton
            loading={loading}
            loadingText="Transmission au Laboratoire..."
            color="purple"
            disabled={selectedTests.length === 0}
            onClick={handleSubmit}
            form="lab-request-form"
          >
            <FlaskConical className="w-4 h-4" />
            {selectedTests.length > 0
              ? `Transmettre ${selectedTests.length} analyse${selectedTests.length > 1 ? 's' : ''} au Laboratoire`
              : 'Sélectionnez vos analyses'}
          </SubmitButton>
        </>
      }
    >
      <form id="lab-request-form" onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {errorMsg && <ModalErrorAlert message={errorMsg} />}

        {/* ─── EN-TÊTE PATIENT & STATUT D'URGENCE ──────────────────────────────── */}
        <div className="p-4 bg-gradient-to-r from-purple-50 via-slate-50 to-pink-50/40 rounded-2xl border border-purple-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {patient.first_name?.[0]}{(patient.last_name || patient.name)?.[0] || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-slate-800 text-sm">{patientName}</p>
                {patient.sex === 'F' && <span className="text-pink-600 font-bold text-xs bg-pink-100 px-1.5 py-0.2 rounded-md">Femme</span>}
                {patient.sex === 'M' && <span className="text-blue-600 font-bold text-xs bg-blue-100 px-1.5 py-0.2 rounded-md">Homme</span>}
                {patient.is_pregnant && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center gap-1">
                    <Baby className="w-3 h-3" /> Enceinte
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                N° Dossier : <strong className="font-mono text-purple-700">#{patient.patient_number || patient.id.slice(0, 8)}</strong>
                {patient.blood && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 font-black rounded-md">{patient.blood}</span>}
              </p>
            </div>
          </div>

          {/* Bouton d'urgence vitale */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border-2 cursor-pointer shadow-sm',
                isUrgent
                  ? 'bg-red-600 text-white border-red-600 ring-4 ring-red-200 animate-pulse'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600'
              )}
            >
              {isUrgent ? <Zap className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {isUrgent ? '🚨 ANALYSES URGENTES' : 'Prescription Ordinaire'}
            </button>
          </div>
        </div>

        {/* ─── SECTION 1 : RENSEIGNEMENTS CLINIQUES & CONDITIONS PRÉ-ANALYTIQUES ─ */}
        <FormSection title="1. Renseignements Cliniques & Indication Diagnostique" icon={<Stethoscope className="w-4 h-4 text-purple-600" />}>
          <div className="space-y-3">
            <FormField label="Indication Clinique / Suspicion Diagnostique Principale" required>
              <ModalInput
                accent="purple"
                placeholder="Ex: Bilan Prénatal CPN 1, Suspicion Paludisme, Surveillance Diabète..."
                value={clinicalIndication}
                onChange={e => setClinicalIndication(e.target.value)}
              />
            </FormField>

            {/* Suggestions d'indications rapides en 1 clic */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_INDICATIONS.map(ind => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setClinicalIndication(ind)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer',
                    clinicalIndication === ind
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-purple-100 text-slate-700 border-slate-200'
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* Conditions pré-analytiques : À jeun / Antibiotiques / Âge gestationnel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Patient à Jeun ?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPatientFasting(true)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      patientFasting
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    ✓ Oui (À jeun)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientFasting(false)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      !patientFasting
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    Non
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Sous Antibiothérapie ?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOnAntibiotics(true)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      onAntibiotics
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    ✓ En cours
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnAntibiotics(false)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      !onAntibiotics
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    Non
                  </button>
                </div>
              </div>

              {isFemaleOrPregnant ? (
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 space-y-1">
                  <label className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                    Terme Grossesse (SA)
                  </label>
                  <ModalInput
                    accent="rose"
                    placeholder="Ex: 12 SA, 28 SA..."
                    value={gestationalAgeSa}
                    onChange={e => setGestationalAgeSa(e.target.value)}
                    className="py-1 text-xs"
                  />
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Type de Prélèvement
                  </label>
                  <select
                    value={sampleType}
                    onChange={e => setSampleType(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-purple-500"
                  >
                    <option value="Sang veineux (Tube EDTA / Sec)">Sang veineux</option>
                    <option value="Sang artériel (Gazométrie)">Sang artériel</option>
                    <option value="Urines (Mi-jet / 24h)">Urines</option>
                    <option value="Prélèvement vaginal / Frottis">Prélèvement vaginal</option>
                    <option value="Selles">Selles</option>
                    <option value="Liquide Céphalo-Rachidien (LCR)">LCR</option>
                  </select>
                </div>
              )}
            </div>

            <FormField label="Notes Médicales Complémentaires pour le Biologiste / Laborantin">
              <ModalTextarea
                accent="purple"
                rows={2}
                placeholder="Traitements particuliers, antécédents de transfusion, contexte épidémiologique..."
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ─── SECTION 2 : SÉLECTION DES ANALYSES (BILANS TYPES VS INDIVIDUELS) ── */}
        <FormSection title="2. Sélection des Examens de Laboratoire" icon={<Layers className="w-4 h-4 text-purple-600" />}>
          {/* Switcher Onglets */}
          <div className="flex gap-2 border-b border-slate-200 pb-2 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('packages')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'packages'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Bilans Types Prédéfinis ({CLINICAL_PACKAGES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'individual'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Catalogue d'Analyses à la Carte ({INDIVIDUAL_TESTS.length})
            </button>
          </div>

          {/* TAB 1 : BILANS TYPES CLINIQUES */}
          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CLINICAL_PACKAGES.map((pkg) => {
                const isAllSelected = pkg.tests.every(t => selectedTests.includes(t));
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 text-left',
                      isAllSelected
                        ? 'border-purple-500 bg-purple-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-purple-300 bg-white hover:bg-slate-50/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', pkg.badgeColor)}>
                          {pkg.badge}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {pkg.tests.length} examens
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                        {pkg.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => applyPackage(pkg)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer',
                          isAllSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                        )}
                      >
                        {isAllSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAllSelected ? 'Pack Sélectionné' : 'Sélectionner ce Bilan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2 : ANALYSES INDIVIDUELLES */}
          {activeTab === 'individual' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un examen (ex: NFS, Glycémie, CRP, Bêta-hCG, Frottis...)"
                  value={searchTest}
                  onChange={e => setSearchTest(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-purple-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {filteredIndividualTests.map((test) => {
                  const selected = selectedTests.includes(test.name);
                  return (
                    <button
                      key={test.name}
                      type="button"
                      onClick={() => toggleTest(test.name)}
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 cursor-pointer',
                        selected
                          ? 'border-purple-500 bg-purple-50 shadow-xs'
                          : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{test.icon}</span>
                        <div className="min-w-0">
                          <p className={cn('text-xs font-bold truncate', selected ? 'text-purple-900' : 'text-slate-700')}>
                            {test.name}
                          </p>
                          <span className="text-[9.5px] font-bold text-slate-400">
                            {test.category}
                          </span>
                        </div>
                      </div>
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Examen personnalisé spécifique */}
              <div className="pt-2 border-t border-slate-200 flex gap-2">
                <ModalInput
                  accent="purple"
                  placeholder="Autre analyse spécifique non répertoriée..."
                  value={customTest}
                  onChange={e => setCustomTest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
                  className="flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
            </div>
          )}

          {/* RÉCAPITULATIF DES ANALYSES SÉLECTIONNÉES */}
          {selectedTests.length > 0 && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50/40 rounded-2xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedTests.length} Analyse{selectedTests.length > 1 ? 's' : ''} au total dans cette ordonnance :
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTests([])}
                  className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Tout effacer
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {selectedTests.map(t => (
                  <span
                    key={t}
                    className="px-2.5 py-1 bg-white border border-purple-200 text-purple-900 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => toggleTest(t)}
                      className="text-purple-400 hover:text-red-600 font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </FormSection>
      </form>
    </ModalShell>
  );
}
