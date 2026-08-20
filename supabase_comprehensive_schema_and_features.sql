-- =============================================================================
-- AL SHIFA - SCRIPT SQL EXHAUSTIF : RENDEZ-VOUS, NAISSANCES, DIAGNOSTICS & RAPPORTS
-- À exécuter dans Supabase SQL Editor
-- =============================================================================

-- 1. TABLE DES RENDEZ-VOUS MÉDICAUX (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  doctor_id TEXT,
  doctor_name TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'planifie', -- 'planifie', 'confirme', 'termine', 'annule', 'reporte', 'absent'
  priority TEXT DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'
  visit_type TEXT DEFAULT 'consultation', -- 'consultation', 'suivi', 'controle', 'urgence', 'gyneco', 'analyse'
  motif TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter colonnes manquantes si la table existe déjà
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'consultation';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS motif TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABLE DES GROSSESSES (GYN_GROSSESSES)
CREATE TABLE IF NOT EXISTS gyn_grossesses (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  date_debut_grossesse DATE,
  date_terme_prevu DATE,
  statut TEXT DEFAULT 'en_cours', -- 'en_cours', 'accouchee', 'interrompue'
  nombre_foetus INTEGER DEFAULT 1,
  ddr DATE,
  dpa DATE,
  semaines_amenorrhee NUMERIC,
  remarques TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gyn_grossesses ADD COLUMN IF NOT EXISTS ddr DATE;
ALTER TABLE gyn_grossesses ADD COLUMN IF NOT EXISTS dpa DATE;
ALTER TABLE gyn_grossesses ADD COLUMN IF NOT EXISTS semaines_amenorrhee NUMERIC;
ALTER TABLE gyn_grossesses ADD COLUMN IF NOT EXISTS remarques TEXT;
ALTER TABLE gyn_grossesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. TABLE DES NAISSANCES ET ENFANTS NÉS (GYN_ACCOUCHEMENTS / NOUVEAU-NÉS)
CREATE TABLE IF NOT EXISTS gyn_accouchements (
  id TEXT PRIMARY KEY,
  grossesse_id TEXT,
  patient_id TEXT NOT NULL, -- ID de la mère
  mother_name TEXT,         -- Nom complet de la mère
  mother_phone TEXT,        -- Téléphone de la mère
  nom_bebe TEXT,
  prenom_bebe TEXT,
  sexe_bebe TEXT DEFAULT 'M', -- 'M' ou 'F'
  date_naissance DATE DEFAULT CURRENT_DATE,
  heure_naissance TEXT,
  poids_bebe_grammes NUMERIC, -- Poids en grammes (ex: 3250) ou kg
  taille_cm NUMERIC,          -- Taille en cm (ex: 50)
  perimetre_cranien_cm NUMERIC,
  type_accouchement TEXT DEFAULT 'voie_basse', -- 'voie_basse', 'cesarienne', 'forceps', 'siege'
  etat_bebe TEXT DEFAULT 'vigoureux',          -- 'vigoureux', 'soins_intensifs', 'reanimation', 'decede'
  apgar_1min INTEGER DEFAULT 9,
  apgar_5min INTEGER DEFAULT 10,
  groupe_sanguin_bebe TEXT,
  complications_mere TEXT,
  complications_bebe TEXT,
  medecin_nom TEXT,
  sage_femme_nom TEXT,
  observations TEXT,
  soins_neonatals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS mother_phone TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS nom_bebe TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS prenom_bebe TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS sexe_bebe TEXT DEFAULT 'M';
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS date_naissance DATE DEFAULT CURRENT_DATE;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS heure_naissance TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS poids_bebe_grammes NUMERIC;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS taille_cm NUMERIC;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS perimetre_cranien_cm NUMERIC;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS type_accouchement TEXT DEFAULT 'voie_basse';
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS etat_bebe TEXT DEFAULT 'vigoureux';
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS apgar_1min INTEGER DEFAULT 9;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS apgar_5min INTEGER DEFAULT 10;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS groupe_sanguin_bebe TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS complications_mere TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS complications_bebe TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS medecin_nom TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS sage_femme_nom TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS soins_neonatals TEXT;
ALTER TABLE gyn_accouchements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. TABLE CATALOGUE DES PATHOLOGIES & DIAGNOSTICS DU PATIENT
CREATE TABLE IF NOT EXISTS pathologies_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Général',
  description TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_diagnostics (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  patient_file_number TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  disease_name TEXT NOT NULL,
  category TEXT DEFAULT 'Général',
  severity TEXT DEFAULT 'simple',         -- 'simple', 'modere', 'grave', 'critique'
  evolution_status TEXT DEFAULT 'en_traitement', -- 'en_traitement', 'gueri', 'en_observation', 'transfere', 'chronique'
  notes TEXT,
  treatment_prescribed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS patient_file_number TEXT;
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Général';
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'simple';
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS evolution_status TEXT DEFAULT 'en_traitement';
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS treatment_prescribed TEXT;
ALTER TABLE patient_diagnostics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. POLITIQUES DE SÉCURITÉ RLS ULTRA-PERMISSIVES (ACCÈS COMPLET MULTI-PAYS)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'appointments',
    'gyn_grossesses',
    'gyn_accouchements',
    'pathologies_catalog',
    'patient_diagnostics',
    'patients',
    'app_users',
    'care_payments',
    'pharmacy_sales',
    'pharmacy_stock',
    'pharmacy_movements',
    'caisse_depenses',
    'lab_tests',
    'vitals_records',
    'prescriptions',
    'nursing_tasks',
    'radio_exams'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_ops_%s" ON %I;', tbl, tbl);
      EXECUTE format('CREATE POLICY "allow_all_ops_%s" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
      EXECUTE format('GRANT ALL ON TABLE %I TO anon, authenticated, service_role;', tbl);
    EXCEPTION WHEN OTHERS THEN
      -- Si une table n'existe pas encore, ignorer l'erreur
      RAISE NOTICE 'Table % skipped: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;
