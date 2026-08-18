import { supabase } from './supabase';
import type { PathologyCatalogItem, PatientDiagnostic, PathologySeverity, PathologyEvolution } from '../types';

export const DEFAULT_PATHOLOGIES: PathologyCatalogItem[] = [
  { id: 'PATH-001', name: 'Paludisme (Malaria)', category: 'Parasitaire & Infectieux', description: 'Infection parasitaire transmise par l’anophèle' },
  { id: 'PATH-002', name: 'Paludisme Grave / Neuropaludisme', category: 'Urgences & Infectieux', description: 'Forme sévère nécessitant hospitalisation' },
  { id: 'PATH-003', name: 'Rhume / Rhinopharyngite', category: 'Respiratoire & ORL', description: 'Infection virale bénigne des voies aériennes' },
  { id: 'PATH-004', name: 'Grippe Saisonnière (Influenza)', category: 'Respiratoire & ORL', description: 'Infection respiratoire fébrile' },
  { id: 'PATH-005', name: 'Fièvre Typhoïde', category: 'Infectieux & Digestif', description: 'Infection bactérienne à Salmonella' },
  { id: 'PATH-006', name: 'Gastro-entérite Aiguë / Diarrhée', category: 'Digestif & Urgences', description: 'Inflammation gastro-intestinale aiguë' },
  { id: 'PATH-007', name: 'Infection Urinaire / Cystite', category: 'Urologie', description: 'Infection des voies urinaires' },
  { id: 'PATH-008', name: 'Hypertension Artérielle (HTA)', category: 'Cardio-vasculaire', description: 'Élévation de la pression artérielle' },
  { id: 'PATH-009', name: 'Diabète Type 2', category: 'Endocrinologie', description: 'Hyperglycémie chronique' },
  { id: 'PATH-010', name: 'Bronchite Aiguë / Pneumonie', category: 'Pneumologie', description: 'Infection des voies respiratoires basses' },
  { id: 'PATH-011', name: 'Anémie Sévère', category: 'Hématologie', description: 'Baisse importante du taux d’hémoglobine' },
  { id: 'PATH-012', name: 'Asthme / Crise d’Asthme', category: 'Pneumologie', description: 'Affection inflammatoire bronchique' },
];

/**
 * Récupère le catalogue de toutes les pathologies (avec fallback localStorage)
 */
export async function getPathologiesCatalog(): Promise<PathologyCatalogItem[]> {
  try {
    const { data, error } = await supabase
      .from('pathologies_catalog')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem('al_shifa_pathologies_catalog', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('Supabase catalog unavailable, using local cache:', e);
  }

  const cached = localStorage.getItem('al_shifa_pathologies_catalog');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch { /* silent */ }
  }
  return DEFAULT_PATHOLOGIES;
}

/**
 * Ajoute une nouvelle pathologie dans le catalogue (par le médecin)
 */
export async function addNewPathologyToCatalog(name: string, category: string = 'Général', description?: string): Promise<PathologyCatalogItem> {
  const newItem: PathologyCatalogItem = {
    id: `PATH-${Date.now()}`,
    name: name.trim(),
    category: category.trim(),
    description: description?.trim(),
    is_custom: true,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('pathologies_catalog').insert([newItem]);
  } catch (e) {
    console.warn('Could not insert pathology into Supabase, saving locally:', e);
  }

  // Mettre à jour le cache local
  const current = await getPathologiesCatalog();
  const updated = [newItem, ...current.filter(p => p.name.toLowerCase() !== name.toLowerCase())];
  localStorage.setItem('al_shifa_pathologies_catalog', JSON.stringify(updated));
  return newItem;
}

/**
 * Enregistre un diagnostic pour un patient
 */
export async function recordPatientDiagnostic(diagnostic: Omit<PatientDiagnostic, 'id' | 'created_at'>): Promise<PatientDiagnostic> {
  const newDiag: PatientDiagnostic = {
    ...diagnostic,
    id: `DIAG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('patient_diagnostics')
      .insert([newDiag])
      .select()
      .single();

    if (!error && data) {
      saveLocalDiagnostic(data);
      return data;
    }
  } catch (e) {
    console.warn('Could not save diagnostic to Supabase, saving locally:', e);
  }

  saveLocalDiagnostic(newDiag);
  return newDiag;
}

/**
 * Met à jour le statut d'évolution d'un diagnostic (ex: Guéri, En cours, Transféré)
 */
export async function updateDiagnosticEvolution(id: string, evolution_status: PathologyEvolution, notes?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('patient_diagnostics')
      .update({ evolution_status, notes: notes || undefined, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      updateLocalDiagnostic(id, evolution_status);
      return true;
    }
  } catch (e) {
    console.warn('Supabase update failed:', e);
  }

  updateLocalDiagnostic(id, evolution_status);
  return true;
}

/**
 * Récupère tous les diagnostics (pour un patient donné ou tous pour les stats)
 */
export async function getPatientDiagnostics(patientId?: string): Promise<PatientDiagnostic[]> {
  try {
    let query = supabase.from('patient_diagnostics').select('*').order('created_at', { ascending: false });
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('Error fetching diagnostics from Supabase:', e);
  }

  // Fallback local storage
  const stored = getLocalDiagnostics();
  if (patientId) {
    return stored.filter(d => d.patient_id === patientId);
  }
  return stored;
}

// Helpers locaux
function getLocalDiagnostics(): PatientDiagnostic[] {
  try {
    const data = localStorage.getItem('al_shifa_patient_diagnostics');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalDiagnostic(diag: PatientDiagnostic) {
  const current = getLocalDiagnostics();
  const updated = [diag, ...current.filter(d => d.id !== diag.id)];
  localStorage.setItem('al_shifa_patient_diagnostics', JSON.stringify(updated));
}

function updateLocalDiagnostic(id: string, evolution_status: PathologyEvolution) {
  const current = getLocalDiagnostics();
  const updated = current.map(d => d.id === id ? { ...d, evolution_status, updated_at: new Date().toISOString() } : d);
  localStorage.setItem('al_shifa_patient_diagnostics', JSON.stringify(updated));
}
