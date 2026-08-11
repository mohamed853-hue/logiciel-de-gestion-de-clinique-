import { useState } from 'react';
import { Button } from './Button';
import { X, FlaskConical, AlertCircle, Plus, Check } from 'lucide-react';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types';

interface LabRequestFormProps {
  patient: Patient;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_TESTS = [
  { name: 'NFS / Hémogramme', category: 'Hématologie' },
  { name: 'Glycémie à jeun', category: 'Biochimie' },
  { name: 'Bilan Rénal (Urée / Créatinine)', category: 'Biochimie' },
  { name: 'Bilan Hépatique (ASAT / ALAT)', category: 'Biochimie' },
  { name: 'CRP (Protéine C-Réactive)', category: 'Inflammation' },
  { name: 'Bilan Lipidique (Cholestérol / Triglycérides)', category: 'Biochimie' },
  { name: 'Bilan d\'hémostase (TP / INR / TCK)', category: 'Hématologie' },
  { name: 'Groupage Sanguin (ABO / Rhésus)', category: 'Immuno-hématologie' },
  { name: 'ECBU (Examen des Urines)', category: 'Bactériologie' },
  { name: 'Bilan Thyroïdien (TSH / FT4)', category: 'Hormonologie' },
  { name: 'Test de Grossesse (Béta-hCG)', category: 'Hormonologie' },
];

export function LabRequestForm({ patient, onClose, onSuccess }: LabRequestFormProps) {
  const { user } = useAuth();
  const { createLabRequest } = useLabRequests();
  const [loading, setLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>(['NFS / Hémogramme']);
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
    if (customTest.trim() && !selectedTests.includes(customTest.trim())) {
      setSelectedTests([...selectedTests, customTest.trim()]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Demande d'Analyses Laboratoire</h2>
              <p className="text-xs text-purple-200">
                Patient : {patient.first_name} {patient.last_name || patient.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Urgence Toggle */}
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
              <AlertCircle className="w-4 h-4 text-purple-600" />
              Priorité d'exécution
            </div>
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isUrgent ? 'bg-red-500 text-white shadow-md' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isUrgent ? '🚨 URGENT' : 'Routine'}
            </button>
          </div>

          {/* Presets List */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Analyses courantes
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TESTS.map((test) => {
                const selected = selectedTests.includes(test.name);
                return (
                  <button
                    key={test.name}
                    type="button"
                    onClick={() => toggleTest(test.name)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      selected
                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p>{test.name}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{test.category}</span>
                    </div>
                    {selected && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Test */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 block">Autre examen spécifique</label>
            <div className="flex gap-2">
              <input
                placeholder="Ex: Hémoculture, Sérodiagnostic..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={customTest}
                onChange={e => setCustomTest(e.target.value)}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddCustom}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Renseignements cliniques */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Renseignements cliniques / Hypothèse</label>
            <textarea
              rows={2}
              placeholder="Suspicion d'infection, suivi de traitement..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? 'Transmission...' : `Envoyer la demande (${selectedTests.length})`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
