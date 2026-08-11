-- =============================================================================
-- MISE À JOUR TABLE PATIENTS - AJOUT DES CHAMPS MANQUANTS
-- Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- 1. AJOUT DES CHAMPS MANQUANTS À LA TABLE PATIENTS
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Algérie',
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS is_accompanied BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS accompanier_type TEXT CHECK (accompanier_type IN ('pere', 'mari', 'femme', 'mere', 'frere', 'proche')),
    ADD COLUMN IF NOT EXISTS case_description TEXT,
    ADD COLUMN IF NOT EXISTS arrival_status TEXT DEFAULT 'stable' CHECK (arrival_status IN ('stable', 'urgent', 'critical', 'deceased')),
    ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMPTZ DEFAULT NOW();

-- 2. MIGRATION DES DONNÉES EXISTANTES (name -> first_name + last_name)
UPDATE public.patients
SET 
    first_name = SPLIT_PART(name, ' ', 1),
    last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
WHERE first_name IS NULL AND name LIKE '% %';

UPDATE public.patients
SET first_name = name
WHERE first_name IS NULL;

-- 3. CRÉATION D'INDEX POUR LES RECHERCHES
CREATE INDEX IF NOT EXISTS idx_patients_arrival_time ON public.patients(arrival_time DESC);
CREATE INDEX IF NOT EXISTS idx_patients_city ON public.patients(city);
CREATE INDEX IF NOT EXISTS idx_patients_arrival_status ON public.patients(arrival_status);

-- 4. RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Table patients mise à jour avec succès !';
    RAISE NOTICE '   → Champs ajoutés : first_name, last_name, country, city';
    RAISE NOTICE '   → Champs ajoutés : is_accompanied, accompanier_type';
    RAISE NOTICE '   → Champs ajoutés : case_description, arrival_status, arrival_time';
    RAISE NOTICE '   → Index créés pour les recherches';
END $$;
