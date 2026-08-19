import { useState } from 'react';
import { Plus, Trash2, Pill, FileText, ChevronDown } from 'lucide-react';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useAuth } from '../contexts/AuthContext';
import type { Patient, PrescriptionItem } from '../types';
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

interface PrescriptionFormProps {
  patient: Patient;
  onClose: () => void;
  onSuccess?: () => void;
}

const FREQ_OPTIONS = ['1 fois par jour', '2 fois par jour', '3 fois par jour', '4 fois par jour', 'Le matin', 'Le soir', 'Avant le repas', 'Après le repas'];
const DUREE_OPTIONS = ['3 jours', '5 jours', '7 jours', '10 jours', '14 jours', '1 mois', '3 mois', '6 mois'];
const DOSAGE_OPTIONS = ['100 mg', '250 mg', '500 mg', '750 mg', '1 g', '5 mg', '10 mg', '20 mg', '40 mg'];

function MedItem({
  item,
  idx,
  total,
  onChange,
  onRemove,
}: {
  item: PrescriptionItem;
  idx: number;
  total: number;
  onChange: (field: keyof PrescriptionItem, val: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-2 border-blue-100 rounded-2xl p-5 space-y-4">
      {/* Numéro + supprimer */}
      <div className="flex items-center justify-between mb-1">
        <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
          {idx + 1}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Nom + dosage */}
      <div className="grid grid-cols-5 gap-3">
        <FormField label="Médicament" required className="col-span-3">
          <ModalInput
            accent="blue"
            required
            placeholder="Ex: Paracétamol, Amoxicilline..."
            value={item.medicament}
            onChange={e => onChange('medicament', e.target.value)}
          />
        </FormField>
        <FormField label="Dosage" className="col-span-2">
          <div className="relative">
            <ModalInput
              accent="blue"
              placeholder="500 mg"
              value={item.dosage}
              list={`dosage-list-${idx}`}
              onChange={e => onChange('dosage', e.target.value)}
            />
            <datalist id={`dosage-list-${idx}`}>
              {DOSAGE_OPTIONS.map(d => <option key={d} value={d} />)}
            </datalist>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </FormField>
      </div>

      {/* Fréquence + durée + quantité */}
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Fréquence">
          <div className="relative">
            <ModalInput
              accent="blue"
              placeholder="3 fois / jour"
              value={item.frequence}
              list={`freq-list-${idx}`}
              onChange={e => onChange('frequence', e.target.value)}
            />
            <datalist id={`freq-list-${idx}`}>
              {FREQ_OPTIONS.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>
        </FormField>
        <FormField label="Durée">
          <div className="relative">
            <ModalInput
              accent="blue"
              placeholder="5 jours"
              value={item.duree}
              list={`duree-list-${idx}`}
              onChange={e => onChange('duree', e.target.value)}
            />
            <datalist id={`duree-list-${idx}`}>
              {DUREE_OPTIONS.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
        </FormField>
        <FormField label="Quantité">
          <ModalInput
            accent="blue"
            placeholder="1 boîte"
            value={item.quantite}
            onChange={e => onChange('quantite', e.target.value)}
          />
        </FormField>
      </div>

      {/* Instructions */}
      <FormField label="Instructions">
        <ModalInput
          accent="blue"
          placeholder="Ex: Après le repas, le soir au coucher..."
          value={item.instructions}
          onChange={e => onChange('instructions', e.target.value)}
        />
      </FormField>
    </div>
  );
}

export function PrescriptionForm({ patient, onClose, onSuccess }: PrescriptionFormProps) {
  const { user } = useAuth();
  const { createPrescription } = usePrescriptions();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicament: '', dosage: '500 mg', quantite: '1 boîte', frequence: '3 fois par jour', duree: '5 jours', instructions: 'Après les repas' }
  ]);
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    setItems([...items, { medicament: '', dosage: '', quantite: '1 boîte', frequence: '3 fois par jour', duree: '5 jours', instructions: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.medicament.trim() !== '');
    if (validItems.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un médicament valide.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await createPrescription({
      patient_id: patient.id,
      doctor_id: user?.id || '',
      doctor_name: `Dr. ${user?.firstName} ${user?.lastName}`,
      items: validItems,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de la création de l\'ordonnance');
    }
  };

  const patientName = `${patient.first_name} ${patient.last_name || patient.name}`;

  return (
    <ModalShell
      icon={<Pill className="w-6 h-6 text-blue-200" />}
      title="Nouvelle Ordonnance Médicale"
      subtitle={`Patient · ${patientName}`}
      color="blue"
      maxWidth="md"
      level={2}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton
            loading={loading}
            loadingText="Enregistrement..."
            color="blue"
            onClick={handleSubmit}
            form="prescription-form"
          >
            <FileText className="w-4 h-4" />
            Valider &amp; Envoyer en Pharmacie
          </SubmitButton>
        </>
      }
    >
      <form id="prescription-form" onSubmit={handleSubmit} className="p-6 space-y-6">
        {errorMsg && <ModalErrorAlert message={errorMsg} />}

        {/* Info patient */}
        <div className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {patient.first_name?.[0]}{(patient.last_name || patient.name)?.[0]}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{patientName}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {patient.age && <span>{patient.age} ans</span>}
              {patient.blood && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">{patient.blood}</span>}
              {patient.allergies && <span className="text-amber-600 font-semibold">⚠️ Allergies : {patient.allergies}</span>}
            </div>
          </div>
        </div>

        {/* Médicaments */}
        <FormSection
          title="Médicaments prescrits"
          icon={<Pill className="w-3.5 h-3.5" />}
        >
          <div className="space-y-4">
            {items.map((item, idx) => (
              <MedItem
                key={idx}
                item={item}
                idx={idx}
                total={items.length}
                onChange={(field, val) => handleItemChange(idx, field, val)}
                onRemove={() => handleRemoveItem(idx)}
              />
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un médicament
            </button>
          </div>
        </FormSection>

        {/* Note médicale */}
        <FormSection title="Note médicale globale (optionnel)" icon={<FileText className="w-3.5 h-3.5" />}>
          <ModalTextarea
            accent="blue"
            rows={3}
            placeholder="Remarques complémentaires pour le pharmacien ou le patient..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </FormSection>

        {/* Hidden submit button (real submit is in footer via form attribute) */}
        <button type="submit" className="hidden" />
      </form>
    </ModalShell>
  );
}
