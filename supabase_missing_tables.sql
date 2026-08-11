-- =============================================================================
-- TABLES MANQUANTES : SECRÉTAIRE & RADIOLOGUE
-- Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- 1. AJOUT DES RÔLES MANQUANTS DANS app_users
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
        'receptionniste',
        'radiologue',
        'secretary'
    ));

-- 2. TABLE RADIOLOGIE (radiology_requests)
CREATE TABLE IF NOT EXISTS public.radiology_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule')),
    exam_type TEXT NOT NULL CHECK (exam_type IN ('xray', 'ultrasound', 'ct', 'mri', 'mammography', 'other')),
    body_part TEXT NOT NULL,
    urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE RÉSULTATS RADIOLOGIE (radiology_results)
CREATE TABLE IF NOT EXISTS public.radiology_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.radiology_requests(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_by TEXT REFERENCES public.app_users(id),
    images TEXT[],
    report TEXT,
    findings TEXT,
    impression TEXT
);

-- 4. TABLE SECRÉTAIRE : DOSSIERS ADMINISTRAtIFS (secretary_records)
CREATE TABLE IF NOT EXISTS public.secretary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('nouveau_dossier', 'mise_a_jour', 'remboursement', 'assurance')),
    documents TEXT[],
    received_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    processed_by TEXT REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE ASSURANCES (insurance_claims)
CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    insurance_company TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by TEXT REFERENCES public.app_users(id),
    notes TEXT
);

-- 6. UTILISATEURS DE DÉMONSTRATION (Radiologue & Secrétaire)
INSERT INTO public.app_users (id, name, email, password, role, status, phone, service, username)
VALUES
    ('USER-RAD-001', 'Dr. Omar Kaddouri',    'radiologue@alshifa.dz',      'rad123',   'radiologue',      'actif', '0550 44 44 44', 'Radiologie',          'dr.kaddouri'),
    ('USER-SEC-001', 'Samira Boudiaf',       'secretary@alshifa.dz',      'sec123',   'secretary',       'actif', '0550 55 55 55', 'Secrétariat',         'samira')
ON CONFLICT (email) DO UPDATE SET
    name     = EXCLUDED.name,
    role     = EXCLUDED.role,
    status   = 'actif';

-- 7. SÉCURITÉ RLS SUR LES NOUVELLES TABLES
ALTER TABLE public.radiology_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read radiology_requests') THEN
        CREATE POLICY "Allow public read radiology_requests" ON public.radiology_requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write radiology_requests') THEN
        CREATE POLICY "Allow public write radiology_requests" ON public.radiology_requests FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read radiology_results') THEN
        CREATE POLICY "Allow public read radiology_results" ON public.radiology_results FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write radiology_results') THEN
        CREATE POLICY "Allow public write radiology_results" ON public.radiology_results FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read secretary_records') THEN
        CREATE POLICY "Allow public read secretary_records" ON public.secretary_records FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write secretary_records') THEN
        CREATE POLICY "Allow public write secretary_records" ON public.secretary_records FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read insurance_claims') THEN
        CREATE POLICY "Allow public read insurance_claims" ON public.insurance_claims FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write insurance_claims') THEN
        CREATE POLICY "Allow public write insurance_claims" ON public.insurance_claims FOR ALL USING (true);
    END IF;
END $$;

-- 8. RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Tables manquantes créées avec succès !';
    RAISE NOTICE '   → Rôles radiologue et secretary ajoutés';
    RAISE NOTICE '   → Tables radiology_requests, radiology_results créées';
    RAISE NOTICE '   → Tables secretary_records, insurance_claims créées';
    RAISE NOTICE '   → Utilisateurs de démonstration créés';
END $$;
