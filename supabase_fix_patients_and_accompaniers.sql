-- =============================================================================
-- AL SHIFA — MISE À JOUR PATIENTS & ACCOMPAGNANTS
-- Exécutez ce script dans l'éditeur SQL de Supabase (SQL Editor)
-- =============================================================================

-- 1. Assouplir les contraintes NOT NULL sur la table patients (pour éviter tout échec)
ALTER TABLE public.patients 
  ALTER COLUMN age DROP NOT NULL,
  ALTER COLUMN sex DROP NOT NULL,
  ALTER COLUMN blood DROP NOT NULL;

-- 2. Ajouter toutes les colonnes enrichies à la table patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_number TEXT,
  ADD COLUMN IF NOT EXISTS visit_reason TEXT DEFAULT 'Consultation',
  ADD COLUMN IF NOT EXISTS arrival_status TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS arrival_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Algérie',
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS is_accompanied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accompanier_id TEXT,
  ADD COLUMN IF NOT EXISTS accompanier_first_name TEXT,
  ADD COLUMN IF NOT EXISTS accompanier_last_name TEXT,
  ADD COLUMN IF NOT EXISTS accompanier_phone TEXT,
  ADD COLUMN IF NOT EXISTS accompanier_relationship TEXT,
  ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pregnancy_months TEXT,
  ADD COLUMN IF NOT EXISTS pregnancy_weeks TEXT,
  ADD COLUMN IF NOT EXISTS ddr TEXT,
  ADD COLUMN IF NOT EXISTS dpa TEXT,
  ADD COLUMN IF NOT EXISTS pregnancy_notes TEXT;

-- 3. Migration douce pour les anciens enregistrements (remplir first_name / last_name à partir de name si nuls)
UPDATE public.patients
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
WHERE first_name IS NULL AND name LIKE '% %';

UPDATE public.patients
SET first_name = name
WHERE first_name IS NULL;

-- 4. Table des accompagnants (si non existante)
CREATE TABLE IF NOT EXISTS public.accompaniers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  relationship TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS permissive pour les accompagnants
ALTER TABLE public.accompaniers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to accompaniers" ON public.accompaniers;
CREATE POLICY "Allow all access to accompaniers" ON public.accompaniers FOR ALL USING (true);

-- Index pour accélérer les recherches de patients
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON public.patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_first_name ON public.patients(first_name);
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON public.patients(last_name);
CREATE INDEX IF NOT EXISTS idx_patients_arrival_status ON public.patients(arrival_status);

-- Rapport
DO $$
BEGIN
  RAISE NOTICE '✅ Table patients et accompaniers mises à jour avec succès !';
END $$;
