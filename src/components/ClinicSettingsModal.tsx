import React, { useState, useRef } from 'react';
import { Settings, Stethoscope, Bed, Building2, CheckCircle2, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import {
  ModalShell,
  FormSection,
  FormField,
  ModalInput,
  CancelButton,
  SubmitButton,
} from './ModalShell';
import { getClinicSettings, saveClinicSettings, compressImageToDataUrl, type ClinicSettings } from '../services/clinicSettingsService';

interface ClinicSettingsModalProps {
  onClose: () => void;
  onSaved?: (settings: ClinicSettings) => void;
}

export function ClinicSettingsModal({ onClose, onSaved }: ClinicSettingsModalProps) {
  const [settings, setSettings] = useState<ClinicSettings>(getClinicSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compressingLogo, setCompressingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('La taille du fichier image ne doit pas dépasser 10 Mo.');
      return;
    }

    try {
      setCompressingLogo(true);
      setErrorMsg(null);
      // Compression de l'image (max 300x300 pour le logo d'entête/reçu)
      const compressedDataUrl = await compressImageToDataUrl(file, 300, 300, 0.85);
      setSettings(prev => ({ ...prev, logoUrl: compressedDataUrl }));
    } catch (err: any) {
      console.error('Erreur compression logo:', err);
      alert('Impossible de traiter cette image. Veuillez en choisir une autre.');
    } finally {
      setCompressingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const result = await saveClinicSettings(settings);
      if (result.success) {
        setSavedSuccess(true);
        if (onSaved) onSaved(settings);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(result.error || 'Erreur lors de la sauvegarde sur le serveur Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur inattendue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      icon={<Settings className="w-5 h-5 text-slate-300" />}
      title="Paramètres de la Clinique & Tarification"
      subtitle="Configuration des tarifs par défaut (FCFA), coordonnées et reçu officiel"
      color="purple"
      maxWidth="xl"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton color="purple" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement en cours...
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Modifications Enregistrées !
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Enregistrer les Tarifs & Paramètres
              </>
            )}
          </SubmitButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* ─── SECTION 1: INFOS & LOGO CLINIQUE ─────────────────────────────── */}
        <FormSection title="1. Identité de la Clinique & Localisation" icon={<Building2 className="w-4 h-4 text-purple-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nom de la Clinique" required>
              <ModalInput
                accent="purple"
                value={settings.clinicName}
                onChange={e => setSettings({ ...settings, clinicName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Téléphone Officiel">
              <ModalInput
                accent="purple"
                value={settings.clinicPhone}
                onChange={e => setSettings({ ...settings, clinicPhone: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FormField label="Pays">
              <ModalInput
                accent="purple"
                placeholder="Ex: Mauritanie, Sénégal, Mali..."
                value={settings.country || ''}
                onChange={e => setSettings({ ...settings, country: e.target.value })}
              />
            </FormField>
            <FormField label="Ville">
              <ModalInput
                accent="purple"
                placeholder="Ex: Nouakchott, Dakar, Bamako..."
                value={settings.city || ''}
                onChange={e => setSettings({ ...settings, city: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FormField label="Adresse Précise">
              <ModalInput
                accent="purple"
                placeholder="Ex: Avenue Centrale, Quartier Médical"
                value={settings.clinicAddress}
                onChange={e => setSettings({ ...settings, clinicAddress: e.target.value })}
              />
            </FormField>
            <FormField label="Email de Contact">
              <ModalInput
                accent="purple"
                placeholder="contact@clinique.com"
                value={settings.clinicEmail || ''}
                onChange={e => setSettings({ ...settings, clinicEmail: e.target.value })}
              />
            </FormField>
          </div>

          <div className="pt-2">
            <FormField label="Logo Officiel de la Clinique">
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleLogoFile(e.dataTransfer.files[0]);
                  }
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/40 border-2 border-dashed border-purple-200 hover:border-purple-400 transition-all"
              >
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  {/* Aperçu du Logo */}
                  <div className="relative w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-200 p-2 flex items-center justify-center flex-shrink-0 overflow-hidden group">
                    {compressingLogo ? (
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    ) : (
                      <img
                        src={settings.logoUrl || '/logo.jpg'}
                        alt="Logo Clinique"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as any).src = '/logo.jpg'; }}
                      />
                    )}
                    {settings.logoUrl && settings.logoUrl !== '/logo.jpg' && !compressingLogo && (
                      <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" title="Logo personnalisé actif" />
                    )}
                  </div>

                  {/* Actions & Explications */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={compressingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {compressingLogo ? 'Traitement...' : 'Choisir une Photo / Logo'}
                      </button>

                      {settings.logoUrl && settings.logoUrl !== '/logo.jpg' && (
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, logoUrl: '/logo.jpg' })}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                          Réinitialiser
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Cliquez sur <strong>Choisir une Photo</strong> ou glissez-déposez votre logo (PNG, JPG, SVG). Il sera compressé automatiquement et affiché sur tous vos <strong>reçus de caisse</strong> et <strong>dossiers médicaux</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </FormField>
          </div>

          <div className="pt-2">
            <FormField label="Message de Bas de Reçu / Ticket">
              <ModalInput
                accent="purple"
                placeholder="Bon rétablissement avec l'aide d'Allah"
                value={settings.receiptFooterNote || ''}
                onChange={e => setSettings({ ...settings, receiptFooterNote: e.target.value })}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ─── SECTION 2: TARIFS CONSULTATIONS (FCFA) ─────────────────────────── */}
        <FormSection title="2. Tarifs des Consultations Médicales (FCFA)" icon={<Stethoscope className="w-4 h-4 text-blue-600" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label="Générale">
              <ModalInput
                accent="blue"
                type="number"
                min="0"
                step="500"
                value={settings.consultationGeneral}
                onChange={e => setSettings({ ...settings, consultationGeneral: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Spécialiste">
              <ModalInput
                accent="blue"
                type="number"
                min="0"
                step="500"
                value={settings.consultationSpecialist}
                onChange={e => setSettings({ ...settings, consultationSpecialist: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Urgence">
              <ModalInput
                accent="blue"
                type="number"
                min="0"
                step="500"
                value={settings.consultationEmergency}
                onChange={e => setSettings({ ...settings, consultationEmergency: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Contrôle">
              <ModalInput
                accent="blue"
                type="number"
                min="0"
                step="500"
                value={settings.consultationControl}
                onChange={e => setSettings({ ...settings, consultationControl: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ─── SECTION 3: TARIFS DES SÉJOURS & CHAMBRES (FCFA) ────────────────── */}
        <FormSection title="3. Tarifs des Chambres & Hospitalisations (FCFA / jour)" icon={<Bed className="w-4 h-4 text-purple-600" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FormField label="Chambre Simple">
              <ModalInput
                accent="purple"
                type="number"
                min="0"
                step="1000"
                value={settings.roomSimple}
                onChange={e => setSettings({ ...settings, roomSimple: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Chambre Double">
              <ModalInput
                accent="purple"
                type="number"
                min="0"
                step="1000"
                value={settings.roomDouble}
                onChange={e => setSettings({ ...settings, roomDouble: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Chambre VIP">
              <ModalInput
                accent="purple"
                type="number"
                min="0"
                step="1000"
                value={settings.roomVip}
                onChange={e => setSettings({ ...settings, roomVip: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Soins Intensifs">
              <ModalInput
                accent="purple"
                type="number"
                min="0"
                step="1000"
                value={settings.roomIntensive}
                onChange={e => setSettings({ ...settings, roomIntensive: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Lit Surveillance">
              <ModalInput
                accent="purple"
                type="number"
                min="0"
                step="500"
                value={settings.roomObservation}
                onChange={e => setSettings({ ...settings, roomObservation: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        </FormSection>
      </form>
    </ModalShell>
  );
}
