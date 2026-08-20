import { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, Activity } from 'lucide-react';
import type { Patient, PathologyCatalogItem, PathologySeverity, PathologyEvolution } from '../types';
import {
  ModalShell,
  FormField,
  ModalInput,
  CancelButton,
  SubmitButton,
} from './ModalShell';
import { getPathologiesCatalog, addNewPathologyToCatalog, recordPatientDiagnostic } from '../services/pathologyService';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../utils/cn';

interface DiagnosticModalProps {
  patient: Patient;
  doctorName?: string;
  doctorId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const SEVERITY_LEVELS: Array<{ id: PathologySeverity; labelFr: string; labelAr: string; color: string; bg: string; icon: string }> = [
  { id: 'simple', labelFr: 'Simple / Bénin', labelAr: 'بسيط / خفيف', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300', icon: '🟢' },
  { id: 'modere', labelFr: 'Moyen / Modéré', labelAr: 'متوسط / معتدل', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300', icon: '🟡' },
  { id: 'grave', labelFr: 'Grave / Sévère', labelAr: 'حاد / خطير', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300', icon: '🟠' },
  { id: 'critique', labelFr: 'Critique / Urgence Vitale', labelAr: 'حرج / إنعاش عاجل', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-300', icon: '🔴' },
];

const EVOLUTION_STATUSES: Array<{ id: PathologyEvolution; labelFr: string; labelAr: string }> = [
  { id: 'en_traitement', labelFr: '💊 En cours de traitement', labelAr: '💊 قيد العلاج' },
  { id: 'gueri', labelFr: '✅ Guéri / Traité avec succès', labelAr: '✅ شفي / عولج بنجاح' },
  { id: 'en_observation', labelFr: '🏥 En observation / Surveillance', labelAr: '🏥 تحت المراقبة' },
  { id: 'transfere', labelFr: '🚑 Transféré / Évacué', labelAr: '🚑 تم تحويله' },
  { id: 'chronique', labelFr: '🔄 Chronique / Suivi régulier', labelAr: '🔄 مزمن / متابعة دورية' },
];

export function DiagnosticModal({
  patient,
  doctorName = 'Dr. Médecin Al Shifa',
  doctorId,
  onClose,
  onSuccess,
}: DiagnosticModalProps) {
  const { isArabic } = useLanguage();
  const [catalog, setCatalog] = useState<PathologyCatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchDisease, setSearchDisease] = useState('');

  // Diagnostic form state
  const [selectedDisease, setSelectedDisease] = useState<string>('Paludisme (Malaria)');
  const [selectedCategory, setSelectedCategory] = useState<string>('Parasitaire & Infectieux');
  const [severity, setSeverity] = useState<PathologySeverity>('simple');
  const [evolutionStatus, setEvolutionStatus] = useState<PathologyEvolution>('en_traitement');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [clinicalRemarks, setClinicalRemarks] = useState('');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    const list = await getPathologiesCatalog();
    setCatalog(list);
    if (list.length > 0) {
      setSelectedDisease(list[0].name);
      setSelectedCategory(list[0].category || 'Général');
    }
  };

  const handleSelectDisease = (disease: PathologyCatalogItem) => {
    setSelectedDisease(disease.name);
    setSelectedCategory(disease.category || 'Général');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const diseaseName = selectedDisease.trim();
    if (!diseaseName) return;

    setSaving(true);
    try {
      // Si la maladie n'est pas encore répertoriée dans le catalogue, l'ajouter automatiquement
      const existsInCatalog = catalog.some(c => c.name.toLowerCase() === diseaseName.toLowerCase());
      if (!existsInCatalog) {
        await addNewPathologyToCatalog(diseaseName, selectedCategory || 'Général');
      }

      await recordPatientDiagnostic({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name || patient.name || ''}`.trim(),
        patient_file_number: patient.patient_number || patient.id?.slice(0, 8),
        doctor_id: doctorId,
        doctor_name: doctorName,
        disease_name: diseaseName,
        category: selectedCategory || 'Général',
        severity,
        evolution_status: evolutionStatus,
        notes: clinicalRemarks.trim() || undefined,
        treatment_prescribed: treatmentNotes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error recording diagnostic:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = catalog.filter(c =>
    !searchDisease ||
    c.name.toLowerCase().includes(searchDisease.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchDisease.toLowerCase())
  );

  return (
    <ModalShell
      title={isArabic ? 'تشخيص الطبيب وتحديد المرض' : 'Diagnostic Médical & Pathologie'}
      subtitle={`${patient.first_name} ${patient.last_name || patient.name || ''} · Dossier : ${patient.patient_number || patient.id?.slice(0, 8)}`}
      onClose={onClose}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>

        {/* ─── 1. SÉLECTION OU SAISIE LIBRE DE LA MALADIE ──────────────────────── */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>{isArabic ? '1. المرض أو التشخيص الطبي (اختيار أو كتابة حرة)' : '1. Pathologie / Diagnostic Médical (Sélection ou Saisie Libre)'}</span>
            </label>

            <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {isArabic ? '✓ يمكنك كتابة أي مرض جديد مباشرة' : '✓ Saisie libre autorisée'}
            </span>
          </div>

          {/* Champ de saisie direct de la maladie */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                required
                list="pathologies-suggestions"
                placeholder={isArabic ? 'اكتب اسم المرض هنا أو اختر من القائمة أدناه...' : 'Tapez le nom de la maladie ou choisissez ci-dessous...'}
                value={selectedDisease}
                onChange={e => {
                  setSelectedDisease(e.target.value);
                  setSearchDisease(e.target.value);
                }}
                className="w-full pl-3 pr-4 py-2.5 border-2 border-teal-500 rounded-xl text-xs sm:text-sm font-bold text-slate-900 bg-white shadow-xs focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <datalist id="pathologies-suggestions">
                {catalog.map(c => (
                  <option key={c.id} value={c.name}>{c.category}</option>
                ))}
              </datalist>
            </div>

            {/* Badges de suggestions rapides */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">{isArabic ? 'أبرز الأمراض الشائعة (انقر للاختيار الفوري) :' : 'Pathologies fréquentes (cliquez pour sélectionner) :'}</p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                {filteredCatalog.slice(0, 15).map(item => {
                  const isSelected = selectedDisease.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectDisease(item)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1',
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs scale-102'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-800'
                      )}
                    >
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-teal-100/60 text-teal-950 text-xs font-bold flex items-center justify-between">
            <span>{isArabic ? 'المرض المحدد :' : 'Pathologie active :'} <strong className="text-teal-900">{selectedDisease}</strong></span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-teal-800 shadow-2xs font-semibold">{selectedCategory}</span>
          </div>
        </div>

        {/* ─── 2. NIVEAU DE GRAVITÉ (SIMPLE / MOYEN / GRAVE / CRITIQUE) ────────── */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{isArabic ? '2. درجة وخطورة الحالة (Paludisme simple / grave...)' : '2. Niveau de Gravité de la Maladie'}</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEVERITY_LEVELS.map((sev) => {
              const isSelected = severity === sev.id;
              return (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                    isSelected
                      ? `${sev.bg} shadow-md scale-[1.02] border-current font-black`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span className="text-base">{sev.icon}</span>
                  <span className={cn('text-xs font-bold', isSelected ? sev.color : 'text-slate-700')}>
                    {isArabic ? sev.labelAr : sev.labelFr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 3. STATUT D'ÉVOLUTION DU PATIENT ────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-600" />
            <span>{isArabic ? '3. حالة تطور المريض وسير العلاج' : '3. Évolution Clinique & Statut Actuel'}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {EVOLUTION_STATUSES.map((evo) => {
              const isSelected = evolutionStatus === evo.id;
              return (
                <button
                  key={evo.id}
                  type="button"
                  onClick={() => setEvolutionStatus(evo.id)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer',
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200'
                  )}
                >
                  {isArabic ? evo.labelAr : evo.labelFr}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 4. NOTES DE TRAITEMENT ET OBSERVATIONS ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={isArabic ? 'بروتوكول العلاج الموصوف' : 'Traitement / Posologie Prescrite'}>
            <ModalInput
              placeholder="Ex: CTA (Artéméther-Luméfantrine) 6 doses, Paracétamol..."
              value={treatmentNotes}
              onChange={e => setTreatmentNotes(e.target.value)}
            />
          </FormField>

          <FormField label={isArabic ? 'ملاحظات وتوجيهات الطبيب' : 'Observations Cliniques & Suivi'}>
            <ModalInput
              placeholder="Ex: Température à 39.2°C, Goutte épaisse positive..."
              value={clinicalRemarks}
              onChange={e => setClinicalRemarks(e.target.value)}
            />
          </FormField>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <CancelButton onClick={onClose} />
          <SubmitButton disabled={saving}>
            {saving ? (isArabic ? 'جاري الحفظ...' : 'Enregistrement...') : (isArabic ? 'تأكيد وحفظ التشخيص' : 'Valider & Enregistrer le Diagnostic')}
          </SubmitButton>
        </div>
      </form>
    </ModalShell>
  );
}
