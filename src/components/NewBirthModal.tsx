import React, { useState } from 'react';
import { Baby, Clock, CheckCircle2, User, Stethoscope, Heart } from 'lucide-react';
import type { Patient, GynAccouchement } from '../types';
import {
  ModalShell,
  FormField,
  FormSection,
  ModalInput,
  ModalSelect,
  ModalTextarea,
  ModalErrorAlert,
  CancelButton,
  SubmitButton,
} from './ModalShell';
import { supabase } from '../services/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../utils/cn';

interface NewBirthModalProps {
  initialPatient?: Patient | null;
  patientsList: Patient[];
  onSuccess?: () => void;
  onClose: () => void;
}

export function NewBirthModal({
  initialPatient,
  patientsList,
  onSuccess,
  onClose,
}: NewBirthModalProps) {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [patientId, setPatientId] = useState<string>(initialPatient?.id || '');
  const [nomBebe, setNomBebe] = useState<string>(initialPatient?.last_name || '');
  const [prenomBebe, setPrenomBebe] = useState<string>('');
  const [sexeBebe, setSexeBebe] = useState<'M' | 'F'>('M');
  const [dateNaissance, setDateNaissance] = useState<string>(new Date().toISOString().slice(0, 10));
  const [heureNaissance, setHeureNaissance] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [poidsGrammes, setPoidsGrammes] = useState<string>('3200');
  const [tailleCm, setTailleCm] = useState<string>('50');
  const [pcCm, setPcCm] = useState<string>('35');
  const [typeAccouchement, setTypeAccouchement] = useState<string>('voie_basse');
  const [etatBebe, setEtatBebe] = useState<string>('vigoureux');
  const [apgar1, setApgar1] = useState<string>('9');
  const [apgar5, setApgar5] = useState<string>('10');
  const [groupeSanguin, setGroupeSanguin] = useState<string>('');
  const [medecinNom, setMedecinNom] = useState<string>('');
  const [sageFemmeNom, setSageFemmeNom] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [soinsNeonatals, setSoinsNeonatals] = useState<string>('Vitamine K1 administrée, collyre antibiotique ophtalmique');

  const selectedMother = initialPatient || patientsList.find(p => p.id === patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setErrorMsg(isArabic ? 'يرجى اختيار الأم المعنية' : 'Veuillez sélectionner la mère du nouveau-né.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const motherName = selectedMother ? `${selectedMother.first_name} ${selectedMother.last_name || selectedMother.name || ''}`.trim() : 'Mère';
      const motherPhone = selectedMother?.phone || '';

      const birthRecord: GynAccouchement = {
        id: `BIRTH-${Date.now()}`,
        patient_id: patientId,
        mother_name: motherName,
        mother_phone: motherPhone,
        nom_bebe: (nomBebe || selectedMother?.last_name || '').trim(),
        prenom_bebe: prenomBebe.trim(),
        sexe_bebe: sexeBebe,
        date_naissance: dateNaissance,
        heure_naissance: heureNaissance,
        poids_bebe_grammes: parseFloat(poidsGrammes) || 3000,
        taille_cm: parseFloat(tailleCm) || 50,
        perimetre_cranien_cm: parseFloat(pcCm) || 35,
        type_accouchement: typeAccouchement,
        etat_bebe: etatBebe,
        apgar_1min: parseInt(apgar1) || 9,
        apgar_5min: parseInt(apgar5) || 10,
        groupe_sanguin_bebe: groupeSanguin || undefined,
        medecin_nom: medecinNom.trim() || undefined,
        sage_femme_nom: sageFemmeNom.trim() || undefined,
        observations: observations.trim() || undefined,
        soins_neonatals: soinsNeonatals.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // 1. Sauvegarde dans Supabase
      const { error } = await supabase.from('gyn_accouchements').insert([birthRecord]);
      if (error) {
        console.warn('Could not insert birth into Supabase, saving to localStorage:', error);
      }

      // 2. Sauvegarde dans le cache local
      const localBirths = JSON.parse(localStorage.getItem('al_shifa_births') || '[]');
      localStorage.setItem('al_shifa_births', JSON.stringify([birthRecord, ...localBirths]));

      // 3. Mettre à jour le statut de la grossesse si existante
      try {
        await supabase
          .from('gyn_grossesses')
          .update({ statut: 'accouchee', updated_at: new Date().toISOString() })
          .eq('patient_id', patientId);
      } catch { /* silent */ }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de l’enregistrement de la naissance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      icon={<Baby className="w-6 h-6 text-pink-300" />}
      title={isArabic ? 'تسجيل ولادة جديدة وإصدار بطاقة المولود' : 'Enregistrement de Naissance & Fiche Nouveau-né'}
      subtitle={isArabic ? 'ربط مباشر بملف الأم وتوثيق الحالة الصحية للطفل' : 'Liaison directe au dossier de la mère & constantes néonatales'}
      color="rose"
      maxWidth="xl"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} label={isArabic ? 'إلغاء' : 'Annuler'} />
          <SubmitButton
            loading={loading}
            loadingText={isArabic ? 'جاري التسجيل...' : 'Enregistrement...'}
            color="rose"
            onClick={handleSubmit}
            form="birth-form"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isArabic ? 'تأكيد وحفظ الولادة' : 'Enregistrer la Naissance'}
          </SubmitButton>
        </>
      }
    >
      <form id="birth-form" onSubmit={handleSubmit} className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
        {errorMsg && <ModalErrorAlert message={errorMsg} />}

        {/* ─── BANNIÈRE APERÇU NOUVEAU-NÉ ───────────────────────────────────── */}
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 p-4 rounded-2xl border border-pink-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              {sexeBebe === 'M' ? '👶🏻' : '👶🏽'}
            </div>
            <div>
              <p className="text-xs font-black text-pink-900">
                {prenomBebe || (isArabic ? 'اسم المولود' : 'Nouveau-né')} {nomBebe || selectedMother?.last_name || ''}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {isArabic ? 'الأم :' : 'Mère :'} <strong className="text-slate-800">{selectedMother ? `${selectedMother.first_name} ${selectedMother.last_name || selectedMother.name || ''}` : (isArabic ? 'غير محددة' : 'Non sélectionnée')}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2.5 py-1 rounded-xl text-xs font-black',
              sexeBebe === 'M' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-pink-100 text-pink-800 border border-pink-200'
            )}>
              {sexeBebe === 'M' ? (isArabic ? '👦 ذكر' : '👦 Garçon') : (isArabic ? '👧 أنثى' : '👧 Fille')}
            </span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
              ⚖️ {poidsGrammes ? `${(parseFloat(poidsGrammes) / 1000).toFixed(2)} kg` : '--'}
            </span>
          </div>
        </div>

        {/* ─── SECTION 1: MÈRE & IDENTITÉ DU BÉBÉ ─────────────────────────────── */}
        <FormSection title={isArabic ? '1. الأم وهوية المولود' : '1. Mère & Identité du Nouveau-né'} icon={<User className="w-4 h-4 text-pink-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sélection de la mère */}
            <FormField label={isArabic ? 'الأم (المريضة)' : 'Mère (Patiente)'} required>
              {initialPatient ? (
                <div className="p-3 bg-pink-50/70 rounded-xl border border-pink-200 font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between">
                  <span>{selectedMother?.first_name} {selectedMother?.last_name || selectedMother?.name}</span>
                  <span className="text-[11px] text-pink-700 font-mono bg-pink-100 px-2 py-0.5 rounded-md">
                    #{selectedMother?.patient_number || 'P-00'}
                  </span>
                </div>
              ) : (
                <ModalSelect
                  accent="rose"
                  required
                  value={patientId}
                  onChange={e => {
                    setPatientId(e.target.value);
                    const m = patientsList.find(p => p.id === e.target.value);
                    if (m && !nomBebe) setNomBebe(m.last_name || '');
                  }}
                >
                  <option value="">{isArabic ? '-- اختر الأم من القائمة --' : '-- Choisir la patiente (Mère) --'}</option>
                  {patientsList.filter(p => p.sex === 'F' || !p.sex).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name || p.name} ({p.phone || (isArabic ? 'بدون هاتف' : 'Sans tél')})
                    </option>
                  ))}
                </ModalSelect>
              )}
            </FormField>

            {/* Sexe du bébé */}
            <FormField label={isArabic ? 'جنس المولود' : 'Sexe de l\'Enfant'} required>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSexeBebe('M')}
                  className={cn(
                    'py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                    sexeBebe === 'M' ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  👦 {isArabic ? 'ذكر (Garçon)' : 'Garçon (M)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSexeBebe('F')}
                  className={cn(
                    'py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                    sexeBebe === 'F' ? 'border-pink-500 bg-pink-50 text-pink-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  👧 {isArabic ? 'أنثى (Fille)' : 'Fille (F)'}
                </button>
              </div>
            </FormField>

            {/* Prénom & Nom */}
            <FormField label={isArabic ? 'اسم المولود (Prénom)' : 'Prénom du Bébé'} hint={isArabic ? 'يمكن تركه فارغاً إذا لم يحدد بعد' : 'Optionnel si non encore attribué'}>
              <ModalInput
                accent="rose"
                placeholder={isArabic ? 'مثال: آدم، مريم...' : 'Ex: Mohamed, Aminata...'}
                value={prenomBebe}
                onChange={e => setPrenomBebe(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'اللقب العائلي (Nom)' : 'Nom de Famille'}>
              <ModalInput
                accent="rose"
                placeholder="Nom"
                value={nomBebe}
                onChange={e => setNomBebe(e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ─── SECTION 2: DATE, HEURE & CONSTANTES NÉONATALES ─────────────────── */}
        <FormSection title={isArabic ? '2. وقت الولادة والمقاييس البيومترية' : '2. Horodatage & Constantes Néonatales'} icon={<Clock className="w-4 h-4 text-pink-600" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label={isArabic ? 'تاريخ الولادة' : 'Date'} required>
              <ModalInput
                accent="rose"
                type="date"
                required
                value={dateNaissance}
                onChange={e => setDateNaissance(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'توقيت الولادة' : 'Heure'}>
              <ModalInput
                accent="rose"
                type="time"
                value={heureNaissance}
                onChange={e => setHeureNaissance(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'الوزن (غرام)' : 'Poids (g)'} required hint="Ex: 3200 g = 3.2 kg">
              <ModalInput
                accent="rose"
                type="number"
                required
                value={poidsGrammes}
                onChange={e => setPoidsGrammes(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'الطول (سم)' : 'Taille (cm)'}>
              <ModalInput
                accent="rose"
                type="number"
                value={tailleCm}
                onChange={e => setTailleCm(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <FormField label={isArabic ? 'محيط الرأس (سم)' : 'Périmètre Crânien'}>
              <ModalInput
                accent="rose"
                type="number"
                placeholder="Ex: 35 cm"
                value={pcCm}
                onChange={e => setPcCm(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'طريقة الولادة' : 'Mode d\'Accouchement'}>
              <ModalSelect
                accent="rose"
                value={typeAccouchement}
                onChange={e => setTypeAccouchement(e.target.value)}
              >
                <option value="voie_basse">👶 {isArabic ? 'ولادة طبيعية (Voie basse)' : 'Voie Basse Spontanée'}</option>
                <option value="cesarienne">🏥 {isArabic ? 'عملية قيصرية (Césarienne)' : 'Césarienne'}</option>
                <option value="forceps">🩺 {isArabic ? 'ولادة بأدوات مساعدة (Instrumentale)' : 'Instrumentale (Ventouse/Forceps)'}</option>
                <option value="siege">🔄 {isArabic ? 'ولادة مقعدية (Siège)' : 'Présentation du Siège'}</option>
              </ModalSelect>
            </FormField>

            <FormField label={isArabic ? 'الحالة العامة للمولود' : 'État Clinique du Bébé'}>
              <ModalSelect
                accent="rose"
                value={etatBebe}
                onChange={e => setEtatBebe(e.target.value)}
              >
                <option value="vigoureux">🟢 {isArabic ? 'حيوي وسليم (Vigoureux)' : 'Vigoureux / Bon état'}</option>
                <option value="soins_intensifs">🟡 {isArabic ? 'تحت المراقبة الحثيثة' : 'Surveillance Néonatale'}</option>
                <option value="reanimation">🔴 {isArabic ? 'إنعاش / عناية مركزة' : 'Réanimation Néonatale'}</option>
              </ModalSelect>
            </FormField>

            <FormField label={isArabic ? 'فصيلة الدم (اختياري)' : 'Groupe Sanguin Bébé'}>
              <ModalSelect
                accent="rose"
                value={groupeSanguin}
                onChange={e => setGroupeSanguin(e.target.value)}
              >
                <option value="">{isArabic ? 'غير محدد' : 'Non déterminé'}</option>
                <option value="O+">O+</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O-">O-</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
              </ModalSelect>
            </FormField>
          </div>

          {/* Score APGAR */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>{isArabic ? 'مؤشر أبغار (Score APGAR) :' : 'Score d\'APGAR :'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-500">{isArabic ? 'دقيقة 1 :' : 'À 1 min :'}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={apgar1}
                  onChange={e => setApgar1(e.target.value)}
                  className="w-12 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">/10</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-500">{isArabic ? 'دقيقة 5 :' : 'À 5 min :'}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={apgar5}
                  onChange={e => setApgar5(e.target.value)}
                  className="w-12 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">/10</span>
              </div>
            </div>
          </div>
        </FormSection>

        {/* ─── SECTION 3: PRATICIENS & SOINS NÉONATALS ───────────────────────── */}
        <FormSection title={isArabic ? '3. الفريق الطبي والرعاية الأولية' : '3. Équipe Médicale & Premiers Soins'} icon={<Stethoscope className="w-4 h-4 text-pink-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={isArabic ? 'الطبيب المولد' : 'Médecin Accoucheur'}>
              <ModalInput
                accent="rose"
                placeholder="Dr. ..."
                value={medecinNom}
                onChange={e => setMedecinNom(e.target.value)}
              />
            </FormField>

            <FormField label={isArabic ? 'القابلة / المساعدة' : 'Sage-Femme / Puéricultrice'}>
              <ModalInput
                accent="rose"
                placeholder="Sage-Femme..."
                value={sageFemmeNom}
                onChange={e => setSageFemmeNom(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={isArabic ? 'العلاجات الأولية للمولود' : 'Soins & Prophylaxie Néonatale'}>
            <ModalInput
              accent="rose"
              value={soinsNeonatals}
              onChange={e => setSoinsNeonatals(e.target.value)}
            />
          </FormField>

          <FormField label={isArabic ? 'ملاحظات وتوصيات' : 'Observations Cliniques & Suites de Couches'}>
            <ModalTextarea
              accent="rose"
              rows={2}
              placeholder={isArabic ? 'ملاحظات إضافية حول صحة الأم والمولود...' : 'Déroulement de l\'expulsion, délivrance, état périnéal, allaitement précoce...'}
              value={observations}
              onChange={e => setObservations(e.target.value)}
            />
          </FormField>
        </FormSection>
      </form>
    </ModalShell>
  );
}
