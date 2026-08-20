import { Baby, Printer, Stethoscope } from 'lucide-react';
import type { GynAccouchement, Patient } from '../types';
import { ModalShell, CancelButton } from './ModalShell';
import { useLanguage } from '../hooks/useLanguage';
import { useClinicSettings } from '../services/clinicSettingsService';

interface NewbornDossierModalProps {
  birthRecord: GynAccouchement;
  motherPatient?: Patient | null;
  onClose: () => void;
}

export function NewbornDossierModal({
  birthRecord,
  motherPatient,
  onClose,
}: NewbornDossierModalProps) {
  const { isArabic } = useLanguage();
  const { settings } = useClinicSettings();

  const babyName = `${birthRecord.prenom_bebe || 'Bébé'} ${birthRecord.nom_bebe || birthRecord.mother_name || ''}`.trim();
  const motherDisplayName = motherPatient
    ? `${motherPatient.first_name} ${motherPatient.last_name || motherPatient.name || ''}`.trim()
    : (birthRecord.mother_name || 'Mère non spécifiée');

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalShell
      icon={<Baby className="w-6 h-6 text-pink-300" />}
      title={isArabic ? `الملف الصحي للمولود : ${babyName}` : `Dossier Néonatal & Fiche de Naissance : ${babyName}`}
      subtitle={isArabic ? `ملف الولادة المرتبط بالأم : ${motherDisplayName}` : `Enfant rattaché au dossier maternel de : ${motherDisplayName}`}
      color="rose"
      maxWidth="xl"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} label={isArabic ? 'إغلاق' : 'Fermer'} />
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-pink-400" />
            {isArabic ? 'طباعة شهادة الولادة والملف' : 'Imprimer Fiche de Naissance (A4)'}
          </button>
        </>
      }
    >
      <div className="space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>

        {/* ─── CARTOUCHE D'IDENTITÉ OFFICIEL NOUVEAU-NÉ ────────────────────────── */}
        <div className="bg-gradient-to-br from-pink-500 via-rose-600 to-pink-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl border border-white/30 shadow-inner">
                {birthRecord.sexe_bebe === 'M' ? '👶🏻' : '👶🏽'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black">{babyName}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-white/25 text-[11px] font-black uppercase">
                    {birthRecord.sexe_bebe === 'M' ? (isArabic ? 'ذكر' : 'Garçon') : (isArabic ? 'أنثى' : 'Fille')}
                  </span>
                </div>
                <p className="text-xs text-pink-100 mt-1 font-medium">
                  {isArabic ? 'الأم :' : 'Mère :'} <strong>{motherDisplayName}</strong> {motherPatient?.phone && `(${motherPatient.phone})`}
                </p>
                <p className="text-[11px] text-pink-200 mt-0.5">
                  {isArabic ? 'تاريخ الولادة :' : 'Né(e) le :'} <strong>{birthRecord.date_naissance ? new Date(birthRecord.date_naissance).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '--'}</strong> {birthRecord.heure_naissance && `à ${birthRecord.heure_naissance}`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-pink-800 shadow-sm inline-block">
                ID: {birthRecord.id}
              </span>
              <p className="text-[10px] text-pink-200 mt-1 font-mono">{settings.clinicName || 'Clinique Al Shifa'}</p>
            </div>
          </div>
        </div>

        {/* ─── MESURES BIOMÉTRIQUES & ÉTAT CLINIQUE ──────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isArabic ? 'الوزن عند الولادة' : 'Poids de Naissance'}</p>
            <p className="text-xl font-black text-slate-800 mt-1">
              {birthRecord.poids_bebe_grammes ? `${(birthRecord.poids_bebe_grammes / (birthRecord.poids_bebe_grammes > 100 ? 1000 : 1)).toFixed(2)} kg` : '--'}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              {birthRecord.poids_bebe_grammes && birthRecord.poids_bebe_grammes >= 2500 ? (isArabic ? '✓ وزن طبيعي' : '✓ Normal') : (isArabic ? '⚠️ قليل الوزن' : '⚠️ Faible')}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isArabic ? 'الطول' : 'Taille'}</p>
            <p className="text-xl font-black text-slate-800 mt-1">
              {birthRecord.taille_cm || 50} <span className="text-xs font-bold text-slate-500">cm</span>
            </p>
            <span className="text-[10px] text-slate-400 font-medium">{isArabic ? 'قياس رأسي' : 'Taille sommet-talon'}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isArabic ? 'محيط الرأس' : 'Périmètre Crânien'}</p>
            <p className="text-xl font-black text-slate-800 mt-1">
              {birthRecord.perimetre_cranien_cm || 35} <span className="text-xs font-bold text-slate-500">cm</span>
            </p>
            <span className="text-[10px] text-slate-400 font-medium">PC néonatal</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isArabic ? 'مؤشر أبغار APGAR' : 'Score APGAR'}</p>
            <p className="text-xl font-black text-rose-600 mt-1">
              {birthRecord.apgar_1min || 9} <span className="text-slate-400 text-xs">/</span> {birthRecord.apgar_5min || 10}
            </p>
            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">
              1 min · 5 min
            </span>
          </div>
        </div>

        {/* ─── DÉTAILS DE L'ACCOUCHEMENT ET SUITES ───────────────────────────── */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-pink-600" />
            <span>{isArabic ? 'معلومات التوليد والفريق الطبي' : 'Modalités d\'Accouchement & Équipe Médicale'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'طريقة الولادة' : 'Mode d\'Accouchement'}</p>
              <p className="font-black text-slate-800 mt-0.5 capitalize">
                {birthRecord.type_accouchement === 'cesarienne' ? (isArabic ? '🏥 عملية قيصرية' : '🏥 Césarienne') : (isArabic ? '👶 ولادة طبيعية عبر المهبل' : '👶 Voie Basse')}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'الحالة السريرية للمولود' : 'État Clinique du Bébé'}</p>
              <p className="font-black text-slate-800 mt-0.5 capitalize">
                {birthRecord.etat_bebe === 'vigoureux' ? (isArabic ? '🟢 حيوي وسليم' : '🟢 Vigoureux / Bon état') : (isArabic ? '🟡 تحت المراقبة' : '🟡 Surveillance')}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'الطبيب المولد' : 'Médecin Accoucheur'}</p>
              <p className="font-bold text-slate-800 mt-0.5">{birthRecord.medecin_nom || (isArabic ? 'غير محدد' : 'Non précisé')}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'القابلة / المساعدة' : 'Sage-Femme'}</p>
              <p className="font-bold text-slate-800 mt-0.5">{birthRecord.sage_femme_nom || (isArabic ? 'غير محدد' : 'Non précisé')}</p>
            </div>
          </div>

          {/* Soins et Prophylaxie */}
          {birthRecord.soins_neonatals && (
            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'العلاجات الأولية واللقاحات' : 'Soins & Prophylaxie Néonatale'}</p>
              <p className="font-medium text-slate-800 mt-0.5">{birthRecord.soins_neonatals}</p>
            </div>
          )}

          {/* Observations */}
          {birthRecord.observations && (
            <div className="p-3 bg-white rounded-xl border border-slate-200/80">
              <p className="text-slate-400 text-[10px] uppercase font-bold">{isArabic ? 'ملاحظات وتوصيات' : 'Observations Cliniques'}</p>
              <p className="font-medium text-slate-800 mt-0.5 italic">{birthRecord.observations}</p>
            </div>
          )}
        </div>

      </div>
    </ModalShell>
  );
}
