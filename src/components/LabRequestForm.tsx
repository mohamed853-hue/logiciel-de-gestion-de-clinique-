import { useState } from 'react';
import { Plus, FlaskConical, Check, AlertCircle, FileText, Zap } from 'lucide-react';
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

const PRESET_TESTS = [
  { name: 'NFS / Hémogramme', category: 'Hématologie', icon: '🩸' },
  { name: 'Glycémie à jeun', category: 'Biochimie', icon: '🍬' },
  { name: 'Bilan Rénal (Urée / Créatinine)', category: 'Biochimie', icon: '🫘' },
  { name: 'Bilan Hépatique (ASAT / ALAT)', category: 'Biochimie', icon: '🫁' },
  { name: 'CRP (Protéine C-Réactive)', category: 'Inflammation', icon: '🔥' },
  { name: 'Bilan Lipidique (Cholestérol / Triglycérides)', category: 'Biochimie', icon: '💉' },
  { name: 'Bilan d\'hémostase (TP / INR / TCK)', category: 'Hématologie', icon: '🩺' },
  { name: 'Groupage Sanguin (ABO / Rhésus)', category: 'Immuno-hématologie', icon: '🅰️' },
  { name: 'ECBU (Examen des Urines)', category: 'Bactériologie', icon: '🔬' },
  { name: 'Bilan Thyroïdien (TSH / FT4)', category: 'Hormonologie', icon: '🦋' },
  { name: 'Test de Grossesse (Béta-hCG)', category: 'Hormonologie', icon: '🤱' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Hématologie': 'text-red-600 bg-red-50',
  'Biochimie': 'text-blue-600 bg-blue-50',
  'Inflammation': 'text-orange-600 bg-orange-50',
  'Immuno-hématologie': 'text-purple-600 bg-purple-50',
  'Bactériologie': 'text-green-600 bg-green-50',
  'Hormonologie': 'text-pink-600 bg-pink-50',
};

export function LabRequestForm({ patient, onClose, onSuccess }: LabRequestFormProps) {
  const { user } = useAuth();
  const { createLabRequest } = useLabRequests();
  const [loading, setLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleTest = (testName: string) => {
    if (selectedTests.includes(testName)) {
      setSelectedTests(selectedTests.filter(t => t !== testName));
    } else {
      setSelectedTests([...selectedTests, testName]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customTest.trim();
    if (trimmed && !selectedTests.includes(trimmed)) {
      setSelectedTests([...selectedTests, trimmed]);
      setCustomTest('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      setErrorMsg('Veuillez sélectionner au moins une analyse.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await createLabRequest({
      patient_id: patient.id,
      doctor_id: user?.id,
      doctor_name: `Dr. ${user?.firstName} ${user?.lastName}`,
      tests: selectedTests.map(t => ({ name: t })),
      urgence: isUrgent,
      clinical_notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de la création de la demande');
    }
  };

  const patientName = `${patient.first_name} ${patient.last_name || patient.name}`;

  return (
    <ModalShell
      icon={<FlaskConical className="w-6 h-6 text-purple-200" />}
      title="Demande d'Analyses Laboratoire"
      subtitle={`Patient · ${patientName}`}
      color="purple"
      maxWidth="md"
      level={2}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton
            loading={loading}
            loadingText="Transmission..."
            color="purple"
            disabled={selectedTests.length === 0}
          >
            <FlaskConical className="w-4 h-4" />
            {selectedTests.length > 0
              ? `Envoyer ${selectedTests.length} analyse${selectedTests.length > 1 ? 's' : ''} au Labo`
              : 'Sélectionnez des analyses'}
          </SubmitButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errorMsg && <ModalErrorAlert message={errorMsg} />}

        {/* Info patient */}
        <div className="flex items-center justify-between p-3.5 bg-purple-50 rounded-2xl border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {patient.first_name?.[0]}{(patient.last_name || patient.name)?.[0]}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{patientName}</p>
              <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                {patient.age && <span>{patient.age} ans</span>}
                {patient.blood && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">{patient.blood}</span>}
              </div>
            </div>
          </div>

          {/* Toggle Urgence */}
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2',
              isUrgent
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200 scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:border-red-200 hover:text-red-500'
            )}
          >
            {isUrgent ? <Zap className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isUrgent ? '🚨 URGENT' : 'Routine'}
          </button>
        </div>

        {/* Analyses présélectionnées */}
        <FormSection title="Analyses courantes" icon={<FlaskConical className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_TESTS.map((test) => {
              const selected = selectedTests.includes(test.name);
              const catColor = CATEGORY_COLORS[test.category] || 'text-slate-600 bg-slate-50';
              return (
                <button
                  key={test.name}
                  type="button"
                  onClick={() => toggleTest(test.name)}
                  className={cn(
                    'p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2',
                    selected
                      ? 'border-purple-400 bg-purple-50 shadow-sm'
                      : 'border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 bg-white'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{test.icon}</span>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-bold truncate', selected ? 'text-purple-900' : 'text-slate-700')}>
                        {test.name}
                      </p>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', catColor)}>
                        {test.category}
                      </span>
                    </div>
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* Examen personnalisé */}
        <FormSection title="Autre examen spécifique" icon={<Plus className="w-3.5 h-3.5" />}>
          <div className="flex gap-2">
            <ModalInput
              accent="purple"
              placeholder="Ex: Hémoculture, Sérodiagnostic VIH, Coproculture..."
              value={customTest}
              onChange={e => setCustomTest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold text-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
          {/* Analyses sélectionnées (custom + preset) */}
          {selectedTests.length > 0 && (
            <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2">
                {selectedTests.length} analyse{selectedTests.length > 1 ? 's' : ''} sélectionnée{selectedTests.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map(t => (
                  <span
                    key={t}
                    className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-purple-800 flex items-center gap-1.5"
                  >
                    {t}
                    <button type="button" onClick={() => toggleTest(t)} className="text-purple-400 hover:text-purple-700">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </FormSection>

        {/* Renseignements cliniques */}
        <FormSection title="Renseignements cliniques / Hypothèse" icon={<FileText className="w-3.5 h-3.5" />}>
          <FormField label="Note pour le laborantin">
            <ModalTextarea
              accent="purple"
              rows={3}
              placeholder="Suspicion d'infection, suivi de traitement anticoagulant, dépistage diabète..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </FormField>
        </FormSection>
      </form>
    </ModalShell>
  );
}
