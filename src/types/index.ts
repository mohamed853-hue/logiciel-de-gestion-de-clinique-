// =============================================================================
// TYPES CENTRAUX — AL SHIFA
// =============================================================================

export type UserRole =
  | 'admin'
  | 'medecin'
  | 'gynecologue'
  | 'infirmier'
  | 'laborantin'
  | 'receptionniste'
  | 'radiologue';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  service?: string;
  createdAt: string;
}

// =============================================================================
// PATIENT
// =============================================================================
export interface Patient {
  id: string;
  patient_number?: string;
  name?: string;
  first_name: string;
  last_name: string;
  age?: number;
  sex?: string;
  phone: string;
  email?: string;
  blood?: string;
  allergies?: string;
  address?: string;
  city?: string;
  country?: string;
  // Motif et état à l'arrivée
  visit_reason?: string;
  visit_reason_other?: string;
  arrival_status?: 'stable' | 'surveiller' | 'urgent' | 'grave' | 'critique' | 'inconscient' | 'autre';
  // Accompagnant
  is_accompanied?: boolean;
  accompanier_id?: string;
  accompanier_first_name?: string;
  accompanier_last_name?: string;
  accompanier_phone?: string;
  accompanier_relationship?: string;
  // Grossesse
  is_pregnant?: boolean;
  pregnancy_months?: string;
  pregnancy_weeks?: string;
  ddr?: string;
  dpa?: string;
  pregnancy_notes?: string;
  case_description?: string;
  // Dates
  arrival_at?: string;
  arrival_time?: string;
  created_at: string;
}

export interface Accompanier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address?: string;
  relationship?: string;
  notes?: string;
}

// =============================================================================
// RENDEZ-VOUS
// =============================================================================
export type AppointmentStatus =
  | 'planifie'
  | 'confirme'
  | 'en_attente'
  | 'en_consultation'
  | 'termine'
  | 'annule'
  | 'reporte'
  | 'absent';

export interface Appointment {
  id: string;
  patient_id: string;
  patient?: Patient;
  patient_name?: string;
  doctor_id?: string;
  doctor?: User;
  doctor_name: string;
  appointment_date: string;
  status: AppointmentStatus;
  priority?: 'normal' | 'urgent' | 'emergency';
  visit_type?: string;
  motif?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// =============================================================================
// CONSULTATION
// =============================================================================
export interface Consultation {
  id: string;
  patient_id: string;
  patient?: Patient;
  doctor_id?: string;
  doctor_name: string;
  motif: string;
  anamnese?: string;
  examen_cli?: string;
  diagnostic?: string;
  traitement?: string;
  notes?: string;
  tension?: string;
  temp?: number;
  poids?: number;
  pouls?: number;
  file_url?: string;
  status: 'en_cours' | 'terminee' | 'annulee';
  prescription_id?: string;
  appointment_id?: string;
  created_at: string;
  updated_at?: string;
}

// =============================================================================
// ORDONNANCES
// =============================================================================
export interface PrescriptionItem {
  medicament: string;
  dosage: string;
  quantite: string;
  frequence: string;
  duree: string;
  voie?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  patient?: Patient;
  doctor_id?: string;
  doctor_name: string;
  consultation_id?: string;
  items: PrescriptionItem[];
  notes?: string;
  status: 'en_attente' | 'delivree' | 'partiellement_delivree' | 'annulee';
  delivered_by?: string;
  delivered_at?: string;
  created_at: string;
  updated_at?: string;
}

// =============================================================================
// LABORATOIRE & BIOLOGIE MÉDICALE
// =============================================================================

export interface LabParamResult {
  param_name: string;
  value: string | number;
  unit?: string;
  reference_range?: string;
  status?: 'normal' | 'low' | 'high' | 'critical' | 'positive' | 'negative';
}

export interface LabRequest {
  id: string;
  patient_id: string;
  patient?: Patient;
  doctor_id?: string;
  doctor_name: string;
  consultation_id?: string;
  priority: 'routine' | 'urgent' | 'emergency';
  status: 'en_attente' | 'preleve' | 'en_cours' | 'termine' | 'annule';
  clinical_notes?: string;
  clinical_indication?: string;
  patient_fasting?: boolean;
  on_antibiotics?: boolean;
  antibiotics_details?: string;
  gestational_age_sa?: string;
  sample_type?: string;
  requested_at?: string;
  completed_at?: string;
  created_at: string;
  items?: LabRequestItem[];
}

export interface LabRequestItem {
  id: string;
  lab_request_id: string;
  test_name: string;
  test_category?: string;
  status: 'en_attente' | 'preleve' | 'en_cours' | 'termine';
  result?: string;
  result_value?: string;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  notes?: string;
  created_at: string;
}

// Table lab_tests enrichie
export interface LabTest {
  id: string;
  patient_id: string;
  patient?: Patient;
  test_name: string;
  requested_by: string;
  doctor_id?: string;
  consultation_id?: string;
  urgence?: boolean;
  status: 'en_attente' | 'preleve' | 'en_cours' | 'termine';
  // Renseignements cliniques
  clinical_indication?: string;
  patient_fasting?: boolean;
  on_antibiotics?: boolean;
  gestational_age_sa?: string;
  sample_type?: string;
  sample_taken_at?: string;
  // Résultats textuels et structurés
  results_text?: string;
  structured_results?: LabParamResult[];
  remarks?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  validated_by?: string;
  validated_at?: string;
  created_at: string;
}

export interface LabReagent {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  expiry_date?: string;
  lot_number?: string;
  status: 'optimal' | 'warning' | 'critical' | 'expired';
}


// =============================================================================
// GROSSESSE
// =============================================================================
export interface GynGrossesse {
  id: string;
  patient_id: string;
  patient?: Patient;
  date_debut_grossesse: string;
  date_terme_prevu: string;
  statut: 'en_cours' | 'accouchee' | 'interrompue';
  nombre_foetus?: number;
  remarques?: string;
  created_at: string;
  updated_at?: string;
}

export interface GynAccouchement {
  id: string;
  grossesse_id?: string;
  patient_id: string;
  date_accouchement: string;
  type_accouchement: 'voie_basse' | 'cesarienne';
  sexe_bebe?: string;
  poids_bebe_grammes?: number;
  observations?: string;
  medecin_nom?: string;
  created_at: string;
}

// =============================================================================
// SOINS INFIRMIERS
// =============================================================================
export interface NursingTask {
  id: string;
  patient_id: string;
  patient?: Patient;
  nurse_id?: string;
  nurse_name?: string;
  doctor_id?: string;
  type: 'injection' | 'pansement' | 'perfusion' | 'constantes' | 'soin_plaie' | 'autre';
  description: string;
  status: 'en_attente' | 'en_cours' | 'termine';
  priority: 'basse' | 'normal' | 'haute' | 'urgente';
  is_billable?: boolean;
  price?: number;
  notes?: string;
  scheduled_for: string;
  completed_at?: string;
  created_at: string;
}

export interface VitalsRecord {
  id: string;
  patient_id: string;
  tension?: string;
  temp?: number;
  poids?: number;
  pouls?: number;
  saturation?: number;
  taille?: number;
  motif?: string;
  soins?: string;
  created_by?: string;
  created_at: string;
}

// =============================================================================
// PHARMACIE
// =============================================================================
export interface PharmacyMedicament {
  id: string;
  code?: string;
  nom: string;
  forme?: string;
  dosage?: string;
  categorie?: string;
  prix_achat_defaut?: number;
  prix_vente_defaut?: number;
  seuil_alerte?: number;
  created_at: string;
}

export interface PharmacyStock {
  id: string;
  medicament_id?: string;
  medicament?: PharmacyMedicament;
  nom: string;
  qte: number;
  prix_achat: number;
  prix: number;
  seuil: number;
  lot_num: string;
  expiry_date?: string;
  supplier?: string;
  updated_at?: string;
}

export interface PharmacyMovement {
  id: string;
  stock_id?: string;
  medicament_nom: string;
  lot_num?: string;
  type_mouvement: 'achat' | 'vente' | 'annulation_vente' | 'remboursement' | 'ajustement' | 'perte';
  qte: number;
  prix_unitaire?: number;
  montant_total?: number;
  patient_id?: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
  created_at: string;
}

// =============================================================================
// FACTURATION & CAISSE
// =============================================================================
export interface Transaction {
  id: string;
  patient_id?: string;
  patient?: Patient;
  type: string;
  montant: number;
  detail: string;
  status: 'validee' | 'annulee' | 'remboursee';
  payment_method?: 'cash' | 'card' | 'transfer' | 'insurance';
  source?: 'consultation' | 'pharmacie' | 'laboratoire' | 'soins' | 'gynecologie' | 'autre';
  created_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  transaction_id?: string;
  patient_id?: string;
  patient_name: string;
  type: string;
  items: InvoiceItem[];
  montant_total: number;
  statut: 'payee' | 'annulee' | 'remboursee';
  created_by?: string;
  created_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CaisseDepense {
  id: string;
  date_depense: string;
  categorie: string;
  description: string;
  montant: number;
  mode_paiement?: string;
  enregistre_par?: string;
  created_at: string;
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================
export interface Notification {
  id: string;
  recipient_role: UserRole;
  recipient_id?: string;
  type: 'lab_result' | 'prescription' | 'appointment' | 'payment' | 'general';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// =============================================================================
// FILE D'ATTENTE
// =============================================================================
export interface FileAttente {
  id: string;
  patient_id: string;
  patient?: Patient;
  patient_nom: string;
  destination: 'medecin' | 'gyneco' | 'labo' | 'infirmerie' | 'pharmacie' | 'caisse';
  statut: 'en_attente' | 'en_consultation' | 'termine' | 'annule';
  notes?: string;
  arrivee_at: string;
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================
export interface DashboardStats {
  totalPatients: number;
  todayPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  urgentCases: number;
  labRequests: number;
  pendingLabResults: number;
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalExpenses: number;
}

// =============================================================================
// PATHOLOGIES & DIAGNOSTICS
// =============================================================================
export type PathologySeverity = 'simple' | 'modere' | 'grave' | 'critique';
export type PathologyEvolution = 'en_traitement' | 'gueri' | 'en_observation' | 'transfere' | 'chronique';

export interface PathologyCatalogItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  is_custom?: boolean;
  created_at?: string;
}

export interface PatientDiagnostic {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_file_number?: string;
  doctor_id?: string;
  doctor_name?: string;
  disease_name: string;
  category?: string;
  severity: PathologySeverity;
  evolution_status: PathologyEvolution;
  notes?: string;
  treatment_prescribed?: string;
  created_at: string;
  updated_at?: string;
}

