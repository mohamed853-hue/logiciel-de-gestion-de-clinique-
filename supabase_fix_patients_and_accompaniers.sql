-- =============================================================================
-- AL SHIFA — MISE À JOUR ULTRA-PERMISSIVE ET COMPLÈTE PATIENTS & PARAMÈTRES
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor) -> "+ New query" -> "Run"
-- =============================================================================

-- 1. S'assurer que la table patients existe
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Assouplir TOUTES les contraintes NOT NULL sur la table patients
-- (Seuls nom/prénom/téléphone sont gérés au niveau de l'application, aucun blocage SQL)
ALTER TABLE public.patients 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN name DROP NOT NULL;

DO $$
BEGIN
  -- Débloquer les colonnes si elles existent déjà avec NOT NULL
  BEGIN
    ALTER TABLE public.patients ALTER COLUMN age DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE public.patients ALTER COLUMN sex DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE public.patients ALTER COLUMN blood DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE public.patients ALTER COLUMN allergies DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER TABLE public.patients ALTER COLUMN address DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Supprimer toute contrainte CHECK restrictive sur la colonne sex (M/F)
  BEGIN
    ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_sex_check;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 3. Ajouter toutes les colonnes enrichies à la table patients si absentes
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS blood TEXT DEFAULT 'Non renseigné',
  ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT 'Aucune',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS patient_number TEXT,
  ADD COLUMN IF NOT EXISTS visit_reason TEXT DEFAULT 'Consultation',
  ADD COLUMN IF NOT EXISTS arrival_status TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS arrival_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Mauritanie',
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

-- 4. Synchroniser first_name et last_name avec name pour les anciens enregistrements
UPDATE public.patients
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
WHERE (first_name IS NULL OR first_name = '') AND name LIKE '% %';

UPDATE public.patients
SET first_name = name
WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL;

UPDATE public.patients
SET name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE name IS NULL OR name = '';

-- 5. Table des accompagnants (si non existante)
CREATE TABLE IF NOT EXISTS public.accompaniers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  relationship TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table de facturation des soins & consultations à l'accueil
CREATE TABLE IF NOT EXISTS public.patient_care_billing (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  care_title TEXT NOT NULL,
  care_code TEXT DEFAULT 'CONS-001',
  unit_price NUMERIC(12,2) DEFAULT 0,
  quantity INT DEFAULT 1,
  total_price NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'paye', 'annule')),
  prescribed_by TEXT DEFAULT 'Accueil / Réception',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des grossesses (suivi CPN)
CREATE TABLE IF NOT EXISTS public.pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  ddr DATE,
  date_terme_prevu DATE,
  statut TEXT DEFAULT 'en_cours',
  remarques TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Configuration RLS ultra-permissive pour l'accès mondial (tous pays)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accompaniers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_care_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Patients
  DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;
  DROP POLICY IF EXISTS "Allow public read patients" ON public.patients;
  DROP POLICY IF EXISTS "Allow public write patients" ON public.patients;
  CREATE POLICY "Allow all access to patients" ON public.patients 
    FOR ALL USING (true) WITH CHECK (true);

  -- Accompaniers
  DROP POLICY IF EXISTS "Allow all access to accompaniers" ON public.accompaniers;
  CREATE POLICY "Allow all access to accompaniers" ON public.accompaniers 
    FOR ALL USING (true) WITH CHECK (true);

  -- Patient Care Billing
  DROP POLICY IF EXISTS "Allow all access to patient_care_billing" ON public.patient_care_billing;
  CREATE POLICY "Allow all access to patient_care_billing" ON public.patient_care_billing 
    FOR ALL USING (true) WITH CHECK (true);

  -- Pregnancies
  DROP POLICY IF EXISTS "Allow all access to pregnancies" ON public.pregnancies;
  CREATE POLICY "Allow all access to pregnancies" ON public.pregnancies 
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 9. Droits d'accès complets pour les rôles Supabase
GRANT ALL ON TABLE public.patients TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.accompaniers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.patient_care_billing TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pregnancies TO anon, authenticated, service_role;

-- 10. Index pour accélérer les recherches instantanées
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON public.patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_first_name ON public.patients(first_name);
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON public.patients(last_name);
CREATE INDEX IF NOT EXISTS idx_patients_arrival_status ON public.patients(arrival_status);

DO $$
BEGIN
  RAISE NOTICE '✅ Configuration complète & ultra-permissive appliquée avec succès pour AL SHIFA !';
END $$;
