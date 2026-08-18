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

export function getClinicSettings(): ClinicSettings {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_SETTINGS;
  try {
    const saved = localStorage.getItem('al_shifa_clinic_settings');
    if (saved) return { ...DEFAULT_CLINIC_SETTINGS, ...JSON.parse(saved) };
  } catch { /* fallback */ }
  return DEFAULT_CLINIC_SETTINGS;
}

export function saveClinicSettings(settings: ClinicSettings): void {
  try {
    localStorage.setItem('al_shifa_clinic_settings', JSON.stringify(settings));
    // Asynchronous background sync to Supabase database table clinic_settings
    syncClinicSettingsToSupabase(settings).catch(() => {});
  } catch { /* silent */ }
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
      receipt_format: settings.receiptFormat,
      consultation_general: settings.consultationGeneral,
      consultation_specialist: settings.consultationSpecialist,
      consultation_emergency: settings.consultationEmergency,
      consultation_control: settings.consultationControl,
      room_simple: settings.roomSimple,
      room_double: settings.roomDouble,
      room_vip: settings.roomVip,
      room_intensive: settings.roomIntensive,
      room_observation: settings.roomObservation,
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

