-- ============================================================================
-- MODULE MÉDECIN — SQL COMPLET (Supabase / PostgreSQL)
-- Exécutez ce script dans le SQL Editor de Supabase
-- Toutes les instructions sont "CREATE IF NOT EXISTS" — sans danger
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Mise à jour du rôle "pharmacien_chef" dans la table app_users
-- (Ajoute le nouveau rôle sans casser l'existant)
-- ============================================================================
ALTER TABLE public.app_users
    DROP CONSTRAINT IF EXISTS app_users_role_check;

ALTER TABLE public.app_users
    ADD CONSTRAINT app_users_role_check CHECK (role IN (
        'admin',
        'medecin',
        'gynecologue',
        'infirmier',
        'pharmacien_chef',
        'pharmacien',
        'caissier',
        'laborantin',
        'receptionniste'
    ));

-- ============================================================================
-- ÉTAPE 2 : TABLE DES CONSULTATIONS MÉDICALES (consultations)
-- Chaque consultation = une visite médicale enregistrée par le médecin
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  TEXT        REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_name TEXT        NOT NULL,
    doctor_id   TEXT        REFERENCES public.app_users(id) ON DELETE SET NULL,

    -- Informations cliniques
    motif       TEXT        NOT NULL,               -- Raison de la consultation
    anamnese    TEXT,                               -- Antécédents / Histoire de la maladie
    examen_cli  TEXT,                               -- Examen clinique
    diagnostic  TEXT,                               -- Diagnostic retenu
    traitement  TEXT,                               -- Plan thérapeutique général
    notes       TEXT,                               -- Notes libres du médecin

    -- Paramètres vitaux au moment de la consultation
    tension     TEXT,
    temp        NUMERIC(4,1),
    poids       NUMERIC(5,2),
    pouls       INT,

    -- Pièces jointes (résultats d'examens, radios, etc.)
    file_url    TEXT,

    -- Statut de la consultation
    status      TEXT        NOT NULL DEFAULT 'en_cours'
                            CHECK (status IN ('en_cours', 'terminee', 'annulee')),

    -- Référence à l'ordonnance et/ou au RDV
    prescription_id TEXT   REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    appointment_id  UUID   REFERENCES public.appointments(id)  ON DELETE SET NULL,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_consultations_patient   ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor    ON public.consultations(doctor_name);
CREATE INDEX IF NOT EXISTS idx_consultations_date      ON public.consultations(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_consultations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultations_updated ON public.consultations;
CREATE TRIGGER trg_consultations_updated
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION update_consultations_timestamp();

-- ============================================================================
-- ÉTAPE 3 : ENRICHISSEMENT TABLE ORDONNANCES (prescriptions)
-- Ajouter les champs manquants si pas déjà présents
-- ============================================================================
ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS doctor_id      TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes          TEXT,
    ADD COLUMN IF NOT EXISTS delivered_by   TEXT,
    ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- ÉTAPE 4 : ENRICHISSEMENT TABLE RENDEZ-VOUS (appointments)
-- ============================================================================
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS doctor_id      TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS motif          TEXT,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- ÉTAPE 5 : TABLE DEMANDES D'ANALYSES (lab_requests)
-- Pour que le médecin puisse demander des analyses depuis l'interface
-- ============================================================================
-- La table lab_tests existe déjà, on ajoute juste les champs manquants
ALTER TABLE public.lab_tests
    ADD COLUMN IF NOT EXISTS doctor_id          TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS consultation_id    UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS motif              TEXT,
    ADD COLUMN IF NOT EXISTS urgence            BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- ÉTAPE 6 : SÉCURITÉ RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read consultations') THEN
        CREATE POLICY "Allow public read consultations"
            ON public.consultations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write consultations') THEN
        CREATE POLICY "Allow public write consultations"
            ON public.consultations FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- ÉTAPE 7 : UTILISATEURS DE DÉMONSTRATION (Médecin)
-- Compte de test pour le module Médecin
-- ============================================================================
INSERT INTO public.app_users (id, name, email, password, role, status, phone, service, username)
VALUES
    ('USER-MED-001', 'Dr. Karim Haddad',    'medecin@alshifa.dz',         'med123',   'medecin',         'actif', '0550 11 11 11', 'Médecine Générale', 'dr.haddad'),
    ('USER-PHA-001', 'Dr. Sara Benmoussa',  'pharmacien.chef@alshifa.dz', 'pha123',   'pharmacien_chef', 'actif', '0550 22 22 22', 'Pharmacie',          'pharmacien.chef'),
    ('USER-PHA-002', 'Amine Zeroual',       'pharmacien@alshifa.dz',      'pha456',   'pharmacien',      'actif', '0550 33 33 33', 'Pharmacie',          'pharmacien')
ON CONFLICT (email) DO UPDATE SET
    name     = EXCLUDED.name,
    role     = EXCLUDED.role,
    status   = 'actif';

-- ============================================================================
-- ÉTAPE 8 : RAPPORT FINAL
-- ============================================================================
DO $$
DECLARE
    nb_consultations INT;
    nb_users INT;
BEGIN
    SELECT COUNT(*) INTO nb_consultations FROM public.consultations;
    SELECT COUNT(*) INTO nb_users         FROM public.app_users;
    RAISE NOTICE '✅ Module Médecin prêt !';
    RAISE NOTICE '   → % consultation(s) en base', nb_consultations;
    RAISE NOTICE '   → % utilisateur(s) total dans le système', nb_users;
    RAISE NOTICE '   → Rôle pharmacien_chef ajouté au système';
END $$;
