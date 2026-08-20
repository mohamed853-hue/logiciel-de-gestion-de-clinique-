import React, { useState } from 'react';
import { UserPlus, User, Baby, Users, Activity, Sparkles, CheckCircle2, CreditCard, Stethoscope, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useClinicSettings } from '../services/clinicSettingsService';
import {
  ModalShell,
  FormSection,
  FormField,
  ModalInput,
  ModalSelect,
  CancelButton,
  SubmitButton,
} from './ModalShell';
import { cn } from '../utils/cn';

interface NewPatientModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const RELATION_OPTIONS = ['Mari', 'Femme', 'Père', 'Mère', 'Frère', 'Sœur', 'Fils', 'Fille', 'Proche', 'Autre'];

export function NewPatientModal({ onClose, onSuccess }: NewPatientModalProps) {
  const { settings: clinicSettings } = useClinicSettings();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  // Numéro de dossier prévisualisé
  const [previewNumber] = useState(() => `P-${Math.floor(100 + Math.random() * 900)}`);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    sex: '',
    phone: '',
    blood: '',
    allergies: '',
    address: '',
    city: '',
    country: 'Sénégal',
    visit_reason: 'Consultation',
    arrival_status: 'stable',
    // Consultation & Paiement
    bill_consultation: true,
    consultation_type: 'Consultation Générale',
    consultation_price: clinicSettings.consultationGeneral || 5000,
    payment_timing: 'pay_now', // 'pay_now' | 'pay_later'
    // Accompagnant
    is_accompanied: false,
    accompanier_first_name: '',
    accompanier_last_name: '',
    accompanier_phone: '',
    accompanier_relationship: 'Mari',
    // Grossesse
    is_pregnant: false,
    pregnancy_months: '',
    pregnancy_weeks: '',
    ddr: '',
    dpa: '',
    pregnancy_notes: '',
  });

  // Calculs grossesse automatiques
  const handleMonthsChange = (monthsStr: string) => {
    const months = parseFloat(monthsStr);
    if (!isNaN(months) && months > 0) {
      const weeks = Math.round(months * 4.33);
      const now = new Date();
      const ddrDate = new Date(now.getTime() - Math.round(months * 30.43 * 86400000));
      const dpaDate = new Date(ddrDate.getTime() + 280 * 86400000);

      setFormData(prev => ({
        ...prev,
        pregnancy_months: monthsStr,
        pregnancy_weeks: weeks.toString(),
        ddr: ddrDate.toISOString().split('T')[0],
        dpa: dpaDate.toISOString().split('T')[0],
      }));
    } else {
      setFormData(prev => ({ ...prev, pregnancy_months: monthsStr }));
    }
  };

  const missingLastName = !formData.last_name.trim();
  const missingFirstName = !formData.first_name.trim();
  const missingPhone = !formData.phone.trim();
  const hasValidationErrors = missingLastName || missingFirstName || missingPhone;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setHasAttemptedSubmit(true);

    if (hasValidationErrors) {
      const missingList: string[] = [];
      if (missingLastName) missingList.push('Nom');
      if (missingFirstName) missingList.push('Prénom');
      if (missingPhone) missingList.push('Numéro de téléphone');
      setErrorMsg(`Champs obligatoires manquants : ${missingList.join(', ')}.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const now = new Date();
      const patientId = crypto.randomUUID();
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      // 1. Enregistrer l'accompagnant dans la table accompaniers si cochée (sans bloquer en cas d'erreur)
      let createdAccompanierId: string | null = null;
      if (formData.is_accompanied && (formData.accompanier_first_name.trim() || formData.accompanier_last_name.trim() || formData.accompanier_phone.trim())) {
        try {
          const accId = crypto.randomUUID();
          const { error: accErr } = await supabase.from('accompaniers').insert([
            {
              id: accId,
              first_name: formData.accompanier_first_name.trim() || 'Accompagnant',
              last_name: formData.accompanier_last_name.trim() || '',
              phone: formData.accompanier_phone.trim() || formData.phone.trim(),
              relationship: formData.accompanier_relationship || 'Proche',
              created_at: now.toISOString(),
            },
          ]);
          if (!accErr) {
            createdAccompanierId = accId;
          }
        } catch (e: any) {
          console.warn('[NewPatientModal] Note table accompaniers (non bloquant):', e?.message);
        }
      }

      // 2. Sécurisation des valeurs par défaut pour les contraintes NOT NULL
      const baseAge = formData.age ? parseInt(formData.age, 10) : 0;
      const baseSex = formData.sex || 'M';
      const baseBlood = formData.blood || 'Non renseigné';
      const baseAllergies = formData.allergies.trim() || 'Aucune';
      const baseAddress = formData.address.trim() || null;

      // Palier 1 : Schéma enrichi complet
      const fullPatientData: any = {
        id: patientId,
        patient_number: previewNumber,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: fullName,
        age: baseAge,
        sex: baseSex,
        phone: formData.phone.trim(),
        blood: baseBlood,
        allergies: baseAllergies,
        address: baseAddress,
        city: formData.city.trim() || null,
        country: formData.country || 'Algérie',
        visit_reason: formData.visit_reason || 'Consultation',
        arrival_status: formData.arrival_status || 'stable',
        arrival_at: now.toISOString(),
        arrival_time: now.toISOString(),
        // Accompagnant
        is_accompanied: formData.is_accompanied,
        accompanier_id: createdAccompanierId,
        accompanier_first_name: formData.is_accompanied ? formData.accompanier_first_name.trim() : null,
        accompanier_last_name: formData.is_accompanied ? formData.accompanier_last_name.trim() : null,
        accompanier_phone: formData.is_accompanied ? formData.accompanier_phone.trim() : null,
        accompanier_relationship: formData.is_accompanied ? formData.accompanier_relationship : null,
        // Grossesse
        is_pregnant: formData.sex === 'F' ? formData.is_pregnant : false,
        pregnancy_months: formData.is_pregnant ? formData.pregnancy_months : null,
        pregnancy_weeks: formData.is_pregnant ? formData.pregnancy_weeks : null,
        ddr: formData.is_pregnant ? formData.ddr : null,
        dpa: formData.is_pregnant ? formData.dpa : null,
        pregnancy_notes: formData.is_pregnant ? formData.pregnancy_notes : null,
        created_at: now.toISOString(),
      };

      let { data: newPatients, error } = await supabase
        .from('patients')
        .insert([fullPatientData])
        .select();

      if (error) {
        console.warn('[NewPatientModal] Palier 1 échoué, essai du palier 2 (schéma standard):', error.message);
        // Palier 2 : Schéma standard
        const standardData: any = {
          id: patientId,
          patient_number: previewNumber,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          name: fullName,
          age: baseAge,
          sex: baseSex,
          phone: formData.phone.trim(),
          blood: baseBlood,
          allergies: baseAllergies,
          address: baseAddress,
          city: formData.city.trim() || null,
          country: formData.country || 'Algérie',
          visit_reason: formData.visit_reason || 'Consultation',
          arrival_status: formData.arrival_status || 'stable',
          arrival_at: now.toISOString(),
          is_accompanied: formData.is_accompanied,
          accompanier_id: createdAccompanierId,
          is_pregnant: formData.sex === 'F' ? formData.is_pregnant : false,
          created_at: now.toISOString(),
        };

        const res2 = await supabase.from('patients').insert([standardData]).select();
        if (res2.error) {
          console.warn('[NewPatientModal] Palier 2 échoué, essai du palier 3 (schéma minimal garanti):', res2.error.message);
          // Palier 3 : Schéma minimal garanti
          const minimalData: any = {
            id: patientId,
            name: fullName,
            age: baseAge,
            sex: baseSex,
            phone: formData.phone.trim(),
            blood: baseBlood,
            allergies: baseAllergies,
            address: baseAddress || 'Non renseignée',
            created_at: now.toISOString(),
          };
          const res3 = await supabase.from('patients').insert([minimalData]).select();
          if (res3.error) {
            console.error('[NewPatientModal] Erreur fatale sur les 3 paliers :', res3.error);
            throw res3.error;
          }
          newPatients = res3.data;
        } else {
          newPatients = res2.data;
        }
      }

      const createdPatient = newPatients?.[0] || { id: patientId, name: fullName, first_name: formData.first_name.trim(), last_name: formData.last_name.trim() };

      // 3. Si femme enceinte, enregistrer dans la table pregnancies (non bloquant)
      if (formData.sex === 'F' && formData.is_pregnant && createdPatient) {
        try {
          const accDesc = formData.is_accompanied
            ? `${formData.accompanier_first_name} ${formData.accompanier_last_name} (${formData.accompanier_relationship})`.trim()
            : 'Non';
          await supabase.from('pregnancies').insert([
            {
              patient_id: createdPatient.id,
              patient_name: fullName,
              ddr: formData.ddr || null,
              date_terme_prevu: formData.dpa || null,
              statut: 'en_cours',
              remarques: `Mois: ${formData.pregnancy_months || '-'}, SA: ${formData.pregnancy_weeks || '-'} | Accompagnant: ${accDesc}`,
              created_at: now.toISOString(),
            },
          ]);
        } catch { /* silent */ }
      }

      // 4. Enregistrer la facture de consultation (non bloquant)
      if (createdPatient && formData.bill_consultation) {
        try {
          await supabase.from('patient_care_billing').insert([
            {
              id: crypto.randomUUID(),
              patient_id: createdPatient.id,
              patient_name: fullName,
              care_title: `🩺 ${formData.consultation_type}`,
              care_code: 'CONS-001',
              unit_price: formData.consultation_price,
              quantity: 1,
              total_price: formData.consultation_price,
              status: formData.payment_timing === 'pay_now' ? 'paye' : 'en_attente',
              prescribed_by: 'Accueil / Réception',
              created_at: now.toISOString(),
            },
          ]);

          if (formData.payment_timing === 'pay_now') {
            await supabase.from('transactions').insert([
              {
                id: crypto.randomUUID(),
                patient_id: createdPatient.id,
                type: 'Facture Consultation',
                montant: formData.consultation_price,
                detail: `Encaissement ${formData.consultation_type} - Dossier ${fullName}`,
                status: 'complete',
                payment_method: 'Espèces',
                source: 'caisse_centrale',
                created_at: now.toISOString(),
              },
            ]);
          }
        } catch { /* silent */ }
      }

      setLoading(false);
      setSuccessSaved(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('[NewPatientModal] Erreur lors de la création du patient :', err);
      setErrorMsg(err.message || 'Erreur lors de la création du dossier patient');
      setLoading(false);
    }
  };

  return (
    <ModalShell
      icon={<UserPlus className="w-5 h-5 text-blue-300" />}
      title="Enregistrement d'un Nouveau Patient"
      subtitle="Seuls le Nom, Prénom et Téléphone sont obligatoires"
      color="blue"
      maxWidth="xl"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton
            loading={loading}
            loadingText="Création du dossier..."
            color="blue"
            onClick={handleSubmit}
            form="new-patient-form"
          >
            <CheckCircle2 className="w-4 h-4" />
            Créer & Enregistrer le Dossier
          </SubmitButton>
        </>
      }
    >
      <form id="new-patient-form" onSubmit={handleSubmit} className="space-y-3.5">
        {/* CARTE D'ERREUR PRÉCISE SI DES CHAMPS OBLIGATOIRES SONT OUBLIÉS */}
        {hasAttemptedSubmit && hasValidationErrors && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl animate-shake">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-black text-rose-900">
                  Attention : Veuillez renseigner les champs obligatoires manquants
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                  Seuls ces 3 éléments sont indispensables pour ouvrir le dossier médical :
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missingLastName && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-200 text-rose-950 font-black text-xs flex items-center gap-1 shadow-2xs">
                      ❌ Nom de famille
                    </span>
                  )}
                  {missingFirstName && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-200 text-rose-950 font-black text-xs flex items-center gap-1 shadow-2xs">
                      ❌ Prénom
                    </span>
                  )}
                  {missingPhone && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-200 text-rose-950 font-black text-xs flex items-center gap-1 shadow-2xs">
                      ❌ Numéro de téléphone
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARTE DE SUCCÈS LORS DE L'ENREGISTREMENT */}
        {successSaved && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 animate-scale-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-950">Patient Enregistré avec Succès ! 🎉</p>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                Le dossier <strong className="font-mono font-black">#{previewNumber}</strong> a été créé et intégré à la file d'attente.
              </p>
            </div>
          </div>
        )}

        {errorMsg && !hasValidationErrors && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* ─── BANNIÈRE APERÇU DU DOSSIER ────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-3 rounded-2xl border border-blue-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-md">
              {formData.first_name ? formData.first_name[0].toUpperCase() : '👤'}
            </div>
            <div>
              <p className="text-xs text-blue-950 font-extrabold flex items-center gap-1.5">
                <span>{formData.first_name || formData.last_name ? `${formData.first_name} ${formData.last_name}`.trim() : 'Nouveau Dossier Patient'}</span>
                {formData.age && <span className="text-slate-500 font-semibold text-[11px]">({formData.age} ans)</span>}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Dossier : <strong className="text-blue-700 font-mono font-black">#{previewNumber}</strong> · Arrivée : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" /> Dossier Actif
          </span>
        </div>

        {/* ─── SECTION 1: ÉTAT CIVIL & CONTACT (3 CHAMPS OBLIGATOIRES) ────────── */}
        <FormSection title="1. Identité & Coordonnées (3 Champs Obligatoires)" icon={<User className="w-4 h-4 text-blue-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nom de Famille" required>
              <ModalInput
                accent="blue"
                required
                placeholder="Ex: Diallo, Benali, Sow..."
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className={hasAttemptedSubmit && missingLastName ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : ''}
              />
            </FormField>

            <FormField label="Prénom du Patient" required>
              <ModalInput
                accent="blue"
                required
                placeholder="Ex: Mohamed, Amina, Mamadou..."
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className={hasAttemptedSubmit && missingFirstName ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : ''}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            <FormField label="N° Téléphone" required>
              <ModalInput
                accent="blue"
                required
                type="tel"
                placeholder="Ex: 06 12 34 56 78"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className={hasAttemptedSubmit && missingPhone ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : ''}
              />
            </FormField>

            <FormField label="Âge (Optionnel)">
              <ModalInput
                accent="blue"
                type="number"
                min="0"
                max="120"
                placeholder="Ex: 34"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
              />
            </FormField>

            <FormField label="Sexe (Optionnel)">
              <ModalSelect
                accent="blue"
                value={formData.sex}
                onChange={e => {
                  const newSex = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    sex: newSex,
                    is_pregnant: newSex === 'F' ? prev.is_pregnant : false,
                  }));
                }}
              >
                <option value="">-- Non spécifié --</option>
                <option value="M">Masculin (M)</option>
                <option value="F">Féminin (F)</option>
              </ModalSelect>
            </FormField>
          </div>

          {/* ─── BLOC GROSSESSE IMMÉDIAT DIRECTEMENT SOUS LE CHOIX DU SEXE ─────── */}
          {formData.sex === 'F' && (
            <div className="p-3 bg-pink-50/80 rounded-2xl border border-pink-200 space-y-2.5 animate-slide-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4 text-pink-600" />
                  <span className="font-extrabold text-pink-950 text-xs">
                    Cette patiente est-elle actuellement enceinte ?
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pregnant}
                    onChange={e => setFormData({ ...formData, is_pregnant: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-pink-800">
                    {formData.is_pregnant ? 'Oui' : 'Non'}
                  </span>
                </label>
              </div>

              {formData.is_pregnant && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-pink-200/80">
                  <FormField label="Mois de Grossesse">
                    <ModalInput
                      accent="rose"
                      type="number"
                      min="1"
                      max="9"
                      placeholder="Ex: 4"
                      value={formData.pregnancy_months}
                      onChange={e => handleMonthsChange(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Terme (SA)">
                    <ModalInput
                      accent="rose"
                      placeholder="Auto"
                      value={formData.pregnancy_weeks ? `${formData.pregnancy_weeks} SA` : ''}
                      readOnly
                      className="bg-pink-100/70 text-pink-900 font-bold"
                    />
                  </FormField>

                  <FormField label="DPA Prévue">
                    <ModalInput
                      accent="rose"
                      type="date"
                      value={formData.dpa}
                      onChange={e => setFormData({ ...formData, dpa: e.target.value })}
                    />
                  </FormField>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            <FormField label="Groupe Sanguin">
              <ModalSelect
                accent="blue"
                value={formData.blood}
                onChange={e => setFormData({ ...formData, blood: e.target.value })}
              >
                <option value="">Non renseigné</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </ModalSelect>
            </FormField>

            <FormField label="Allergies / Antécédents">
              <ModalInput
                accent="blue"
                placeholder="Ex: Pénicilline, Asthme..."
                value={formData.allergies}
                onChange={e => setFormData({ ...formData, allergies: e.target.value })}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ─── SECTION 2: MOTIF & ÉTAT D'ARRIVÉE ───────────────────────────────── */}
        <FormSection title="2. Motif d'Accueil & État Clinique (Optionnel)" icon={<Activity className="w-4 h-4 text-blue-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Motif Principal">
              <ModalSelect
                accent="blue"
                value={formData.visit_reason}
                onChange={e => setFormData({ ...formData, visit_reason: e.target.value })}
              >
                <option value="Consultation">🩺 Consultation Générale</option>
                <option value="Suivi Médical">📋 Suivi Médical</option>
                <option value="Soins / Injection">💉 Soins & Injections</option>
                <option value="Hospitalisation">🛏️ Hospitalisation / Séjour</option>
                <option value="Urgence">🚨 Consultation d'Urgence</option>
                <option value="Suivi de Grossesse">👶 Suivi Grossesse</option>
                <option value="Analyses Labo">🔬 Analyses de Laboratoire</option>
                <option value="Pharmacie">💊 Achat Médicaments</option>
              </ModalSelect>
            </FormField>

            <FormField label="Ville / Commune">
              <ModalInput
                accent="blue"
                placeholder="Ex: Alger, Oran, Blida..."
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </FormField>
          </div>

          <div className="pt-1">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              État Clinique à l'Arrivée
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'stable', label: '✓ Patient Stable', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                { id: 'preoccupant', label: '⚡ Préoccupant', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                { id: 'urgent', label: '🚨 Urgence', color: 'border-rose-500 bg-rose-50 text-rose-800' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, arrival_status: s.id })}
                  className={cn(
                    'py-2 px-2.5 rounded-xl border-2 text-xs font-black transition-all text-center cursor-pointer',
                    formData.arrival_status === s.id
                      ? `${s.color} ring-2 ring-blue-500/20 shadow-xs scale-[1.02]`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </FormSection>

        {/* ─── SECTION 3: PROCHE ACCOMPAGNANT ──────────────────────────────────── */}
        <FormSection title="3. Proche Accompagnant" icon={<Users className="w-4 h-4 text-blue-600" />}>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-extrabold text-slate-800 text-xs">
                Le patient est-il accompagné d'un proche ?
              </span>
              <input
                type="checkbox"
                checked={formData.is_accompanied}
                onChange={e => setFormData({ ...formData, is_accompanied: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </label>

            {formData.is_accompanied && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200 animate-slide-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormField label="Prénom de l'Accompagnant">
                    <ModalInput
                      accent="blue"
                      placeholder="Ex: Fatou, Amina, Ousmane..."
                      value={formData.accompanier_first_name}
                      onChange={e => setFormData({ ...formData, accompanier_first_name: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Nom de Famille de l'Accompagnant">
                    <ModalInput
                      accent="blue"
                      placeholder="Ex: Diallo, Diop, Sow..."
                      value={formData.accompanier_last_name}
                      onChange={e => setFormData({ ...formData, accompanier_last_name: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormField label="N° Téléphone de l'Accompagnant">
                    <ModalInput
                      accent="blue"
                      type="tel"
                      placeholder="06 XX XX XX XX"
                      value={formData.accompanier_phone}
                      onChange={e => setFormData({ ...formData, accompanier_phone: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Lien de Parenté">
                    <ModalSelect
                      accent="blue"
                      value={formData.accompanier_relationship}
                      onChange={e => setFormData({ ...formData, accompanier_relationship: e.target.value })}
                    >
                      {RELATION_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </ModalSelect>
                  </FormField>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ─── SECTION 4: CONSULTATION & RÈGLEMENT À L'ACCUEIL ──────────────────── */}
        <FormSection title="4. Consultation Médicale & Règlement" icon={<CreditCard className="w-4 h-4 text-emerald-600" />}>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-slate-800 text-xs">
                  Facturer un acte de consultation dès l'enregistrement
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.bill_consultation}
                onChange={e => setFormData({ ...formData, bill_consultation: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            {formData.bill_consultation && (
              <div className="space-y-3 pt-2 border-t border-slate-200 animate-slide-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormField label="Type d'Acte Médical">
                    <ModalSelect
                      accent="emerald"
                      value={formData.consultation_type}
                      onChange={e => {
                        const t = e.target.value;
                        const p = t === 'Consultation Spécialiste' ? (clinicSettings.consultationSpecialist || 10000)
                          : t === 'Consultation d\'Urgence' ? (clinicSettings.consultationEmergency || 7500)
                          : t === 'Contrôle / Suivi' ? (clinicSettings.consultationControl || 3000)
                          : (clinicSettings.consultationGeneral || 5000);
                        setFormData({ ...formData, consultation_type: t, consultation_price: p });
                      }}
                    >
                      <option value="Consultation Générale">🩺 Consultation Générale ({clinicSettings.consultationGeneral || 5000} FCFA)</option>
                      <option value="Consultation Spécialiste">👨‍⚕️ Spécialiste / Gynéco ({clinicSettings.consultationSpecialist || 10000} FCFA)</option>
                      <option value="Consultation d'Urgence">🚨 Urgence ({clinicSettings.consultationEmergency || 7500} FCFA)</option>
                      <option value="Contrôle / Suivi">🔍 Contrôle ({clinicSettings.consultationControl || 3000} FCFA)</option>
                    </ModalSelect>
                  </FormField>

                  <FormField label="Montant à Régler (FCFA)">
                    <ModalInput
                      accent="emerald"
                      type="number"
                      value={formData.consultation_price}
                      onChange={e => setFormData({ ...formData, consultation_price: parseFloat(e.target.value) || 0 })}
                    />
                  </FormField>
                </div>

                {/* Timing du paiement */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Modalité de Paiement</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_timing: 'pay_now' })}
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer',
                        formData.payment_timing === 'pay_now'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <div>
                        <p className="font-extrabold">💳 Payer Maintenant</p>
                        <p className="text-[10px] text-emerald-700 font-medium">Validé & Reçu direct à la caisse</p>
                      </div>
                      {formData.payment_timing === 'pay_now' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_timing: 'pay_later' })}
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer',
                        formData.payment_timing === 'pay_later'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <div>
                        <p className="font-extrabold">⏳ Payer Après Consultation</p>
                        <p className="text-[10px] text-amber-700 font-medium">Facture mise en attente</p>
                      </div>
                      {formData.payment_timing === 'pay_later' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </FormSection>
      </form>
    </ModalShell>
  );
}
