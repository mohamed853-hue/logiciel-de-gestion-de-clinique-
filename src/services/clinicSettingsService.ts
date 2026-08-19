import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface ClinicSettings {
  clinicName: string;
  clinicPhone: string;
  country: string;
  city: string;
  clinicAddress: string;
  clinicEmail?: string;
  currency: string;
  logoUrl: string;
  receiptFooterNote?: string;
  receiptFormat?: 'thermal_80mm' | 'standard_a4';
  // Tarifs Consultations (FCFA)
  consultationGeneral: number;
  consultationSpecialist: number;
  consultationEmergency: number;
  consultationControl: number;
  // Tarifs Chambres (FCFA)
  roomSimple: number;
  roomDouble: number;
  roomVip: number;
  roomIntensive: number;
  roomObservation: number;
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: 'Clinique Médicale AL SHIFA',
  clinicPhone: '+222 45 00 00 00',
  country: 'Mauritanie',
  city: 'Nouakchott',
  clinicAddress: 'Avenue Principale, Centre Ville',
  clinicEmail: 'contact@clinique-alshifa.com',
  currency: 'FCFA',
  logoUrl: '/logo.jpg',
  receiptFooterNote: 'Merci de votre confiance. Bon rétablissement avec l\'aide d\'Allah.',
  receiptFormat: 'thermal_80mm',
  consultationGeneral: 5000,
  consultationSpecialist: 10000,
  consultationEmergency: 7500,
  consultationControl: 3000,
  roomSimple: 15000,
  roomDouble: 10000,
  roomVip: 25000,
  roomIntensive: 40000,
  roomObservation: 7500,
};

export const CLINIC_SETTINGS_EVENT = 'clinicSettingsChanged';

export function getClinicSettings(): ClinicSettings {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_SETTINGS;
  try {
    const saved = localStorage.getItem('al_shifa_clinic_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CLINIC_SETTINGS, ...parsed };
    }
  } catch { /* fallback */ }
  return DEFAULT_CLINIC_SETTINGS;
}

/**
 * Compresse une image en canvas pour éviter de saturer le localStorage et Supabase (max ~50 Ko)
 */
export async function compressImageToDataUrl(file: File, maxWidth = 300, maxHeight = 300, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier image'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Fond transparent préservé si PNG, sinon fond blanc
        ctx.drawImage(img, 0, 0, width, height);

        // Format webp ou jpeg pour une compression optimale
        try {
          const compressed = canvas.toDataURL('image/webp', quality);
          resolve(compressed);
        } catch {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sauvegarde les paramètres en local et sur Supabase de manière asynchrone avec notification globale
 */
export async function saveClinicSettings(settings: ClinicSettings): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Sauvegarde locale immédiate
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('al_shifa_clinic_settings', JSON.stringify(settings));
      }
    } catch (e) {
      console.warn('LocalStorage quota issue:', e);
    }

    // 2. Émission de l'événement global pour mise à jour immédiate de tous les composants React
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CLINIC_SETTINGS_EVENT, { detail: settings }));
    }

    // 3. Synchronisation avec Supabase (attente explicite)
    const synced = await syncClinicSettingsToSupabase(settings);
    if (!synced) {
      return { success: false, error: 'Les modifications ont été sauvegardées localement mais n\'ont pas pu être synchronisées avec Supabase.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erreur lors de la sauvegarde des paramètres:', err);
    return { success: false, error: err?.message || 'Erreur inattendue lors de la sauvegarde.' };
  }
}

export async function fetchClinicSettingsFromSupabase(): Promise<ClinicSettings> {
  try {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data) {
      const mapped: ClinicSettings = {
        clinicName: data.clinic_name || DEFAULT_CLINIC_SETTINGS.clinicName,
        clinicPhone: data.clinic_phone || DEFAULT_CLINIC_SETTINGS.clinicPhone,
        country: data.country || DEFAULT_CLINIC_SETTINGS.country,
        city: data.city || DEFAULT_CLINIC_SETTINGS.city,
        clinicAddress: data.clinic_address || DEFAULT_CLINIC_SETTINGS.clinicAddress,
        clinicEmail: data.clinic_email || DEFAULT_CLINIC_SETTINGS.clinicEmail,
        currency: data.currency || DEFAULT_CLINIC_SETTINGS.currency,
        logoUrl: data.logo_url || DEFAULT_CLINIC_SETTINGS.logoUrl,
        receiptFooterNote: data.receipt_footer_note || DEFAULT_CLINIC_SETTINGS.receiptFooterNote,
        receiptFormat: data.receipt_format || DEFAULT_CLINIC_SETTINGS.receiptFormat,
        consultationGeneral: Number(data.consultation_general ?? DEFAULT_CLINIC_SETTINGS.consultationGeneral),
        consultationSpecialist: Number(data.consultation_specialist ?? DEFAULT_CLINIC_SETTINGS.consultationSpecialist),
        consultationEmergency: Number(data.consultation_emergency ?? DEFAULT_CLINIC_SETTINGS.consultationEmergency),
        consultationControl: Number(data.consultation_control ?? DEFAULT_CLINIC_SETTINGS.consultationControl),
        roomSimple: Number(data.room_simple ?? DEFAULT_CLINIC_SETTINGS.roomSimple),
        roomDouble: Number(data.room_double ?? DEFAULT_CLINIC_SETTINGS.roomDouble),
        roomVip: Number(data.room_vip ?? DEFAULT_CLINIC_SETTINGS.roomVip),
        roomIntensive: Number(data.room_intensive ?? DEFAULT_CLINIC_SETTINGS.roomIntensive),
        roomObservation: Number(data.room_observation ?? DEFAULT_CLINIC_SETTINGS.roomObservation),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('al_shifa_clinic_settings', JSON.stringify(mapped));
        window.dispatchEvent(new CustomEvent(CLINIC_SETTINGS_EVENT, { detail: mapped }));
      }
      return mapped;
    }
  } catch (e) {
    console.warn('Could not fetch clinic settings from Supabase:', e);
  }
  return getClinicSettings();
}

export async function syncClinicSettingsToSupabase(settings: ClinicSettings): Promise<boolean> {
  try {
    const payload = {
      id: 'default',
      clinic_name: settings.clinicName,
      clinic_phone: settings.clinicPhone,
      country: settings.country,
      city: settings.city,
      clinic_address: settings.clinicAddress,
      clinic_email: settings.clinicEmail,
      currency: settings.currency,
      logo_url: settings.logoUrl,
      receipt_footer_note: settings.receiptFooterNote,
      receipt_format: settings.receiptFormat || 'thermal_80mm',
      consultation_general: Number(settings.consultationGeneral) || 0,
      consultation_specialist: Number(settings.consultationSpecialist) || 0,
      consultation_emergency: Number(settings.consultationEmergency) || 0,
      consultation_control: Number(settings.consultationControl) || 0,
      room_simple: Number(settings.roomSimple) || 0,
      room_double: Number(settings.roomDouble) || 0,
      room_vip: Number(settings.roomVip) || 0,
      room_intensive: Number(settings.roomIntensive) || 0,
      room_observation: Number(settings.roomObservation) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('clinic_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Error saving clinic settings to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error saving clinic settings:', err);
    return false;
  }
}

/**
 * Hook React personnalisé pour écouter et synchroniser les paramètres de la clinique en temps réel
 */
export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettings>(getClinicSettings);

  useEffect(() => {
    // 1. Initialiser avec les paramètres actuels
    setSettings(getClinicSettings());

    // 2. Écouter les modifications émises dans l'application
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<ClinicSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getClinicSettings());
      }
    };

    window.addEventListener(CLINIC_SETTINGS_EVENT, handleSettingsChange);
    return () => window.removeEventListener(CLINIC_SETTINGS_EVENT, handleSettingsChange);
  }, []);

  return { settings, setSettings };
}
