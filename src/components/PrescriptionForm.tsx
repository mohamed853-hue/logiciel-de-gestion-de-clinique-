import { useState } from 'react';
import { Button } from './Button';
import { X, Plus, Trash2, Pill } from 'lucide-react';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useAuth } from '../contexts/AuthContext';
import type { Patient, PrescriptionItem } from '../types';

interface PrescriptionFormProps {
  patient: Patient;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PrescriptionForm({ patient, onClose, onSuccess }: PrescriptionFormProps) {
  const { user } = useAuth();
  const { createPrescription } = usePrescriptions();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicament: '', dosage: '500 mg', quantite: '1 boite', frequence: '3 fois par jour', duree: '5 jours', instructions: 'Après les repas' }
  ]);
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    setItems([
      ...items,
      { medicament: '', dosage: '', quantite: '1 boite', frequence: '3 fois par jour', duree: '5 jours', instructions: '' }
    ]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Pill className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Nouvelle Ordonnance</h2>
              <p className="text-xs text-blue-200">
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Liste des médicaments
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter médicament
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Nom du médicament *</label>
                    <input
                      required
                      placeholder="Ex: Paracétamol, Amoxicilline..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.medicament}
                      onChange={e => handleItemChange(idx, 'medicament', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Dosage</label>
                    <input
                      placeholder="Ex: 500 mg, 1g..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.dosage}
                      onChange={e => handleItemChange(idx, 'dosage', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">Fréquence</label>
                    <input
                      placeholder="3 fois / jour"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.frequence}
                      onChange={e => handleItemChange(idx, 'frequence', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">Durée</label>
                    <input
                      placeholder="5 jours"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.duree}
                      onChange={e => handleItemChange(idx, 'duree', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 mb-1 block">Quantité</label>
                    <input
                      placeholder="1 boîte"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.quantite}
                      onChange={e => handleItemChange(idx, 'quantite', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Instructions particulières</label>
                  <input
                    placeholder="Ex: Après le repas, le soir au coucher..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={item.instructions}
                    onChange={e => handleItemChange(idx, 'instructions', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Note médicale globale (optionnel)</label>
            <textarea
              rows={2}
              placeholder="Remarques complémentaires..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : 'Valider & Envoyer en Pharmacie'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
