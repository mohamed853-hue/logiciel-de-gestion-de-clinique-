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
  } catch { /* silent */ }
}
