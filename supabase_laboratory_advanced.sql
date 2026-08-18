-- =============================================================================
-- MODULE LABORATOIRE DE BIOLOGIE MÉDICALE & RELATIONS INTER-SERVICES
-- Exécutez ce script dans l'éditeur SQL de votre Dashboard Supabase
-- =============================================================================

-- 1. Extension de la table des examens de laboratoire (lab_tests)
ALTER TABLE IF EXISTS public.lab_tests
    ADD COLUMN IF NOT EXISTS clinical_indication TEXT,
    ADD COLUMN IF NOT EXISTS patient_fasting BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS on_antibiotics BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gestational_age_sa TEXT,
    ADD COLUMN IF NOT EXISTS sample_type TEXT DEFAULT 'Sang veineux',
    ADD COLUMN IF NOT EXISTS sample_taken_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS structured_results JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_type TEXT,
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS validated_by TEXT,
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Index de performance pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON public.lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON public.lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_created_at ON public.lab_tests(created_at DESC);

-- 2. Table des Réactifs & Consommables de Laboratoire (lab_reagents)
CREATE TABLE IF NOT EXISTS public.lab_reagents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'unités',
    min_threshold INTEGER NOT NULL DEFAULT 10,
    lot_number TEXT,
    expiry_date DATE,
    status TEXT DEFAULT 'optimal' CHECK (status IN ('optimal', 'warning', 'critical', 'expired')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion des réactifs et consommables clés
INSERT INTO public.lab_reagents (name, category, quantity, unit, min_threshold, status)
VALUES
    ('Tubes EDTA K3 (Bouchon Violet 4mL)', 'Tubes & Prélèvements', 250, 'tubes', 50, 'optimal'),
    ('Tubes Secs avec Activateur (Bouchon Rouge 5mL)', 'Tubes & Prélèvements', 200, 'tubes', 40, 'optimal'),
    ('Tubes Citrate de Sodium 3.2% (Bouchon Bleu)', 'Hémostase', 80, 'tubes', 30, 'optimal'),
    ('Tubes Héparinate de Lithium (Bouchon Vert)', 'Biochimie', 45, 'tubes', 30, 'optimal'),
    ('Bandelettes Urinaires 10 Paramètres (Uro-Test)', 'Uro-chimie', 100, 'tests', 25, 'optimal'),
    ('Tests Rapides Diagnostic Paludisme (TDR Pf/Pan)', 'Parasitologie', 150, 'tests', 35, 'optimal'),
    ('Tests de Grossesse Rapides Bêta-hCG Urinaire', 'Hormonologie', 100, 'tests', 20, 'optimal'),
    ('Kit Réactif Sérodiagnostic de Widal & Félix', 'Sérologie', 15, 'flacons', 5, 'optimal'),
    ('Écouvillons Stériles Prélèvement Vaginal / Cervical', 'Bactériologie', 30, 'écouvillons', 20, 'optimal'),
    ('Lames de Microscopie Dépolies 76x26mm', 'Consommables', 350, 'lames', 100, 'optimal')
ON CONFLICT (id) DO NOTHING;

-- 3. Activation de la sécurité RLS (Row Level Security)
ALTER TABLE public.lab_reagents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read lab_reagents') THEN
        CREATE POLICY "Allow public read lab_reagents" ON public.lab_reagents FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write lab_reagents') THEN
        CREATE POLICY "Allow public write lab_reagents" ON public.lab_reagents FOR ALL USING (true);
    END IF;
END $$;

-- 4. Création automatique du bucket de stockage pour les rapports de laboratoire
-- Si vous utilisez Supabase Storage, activez le bucket public 'lab-results'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lab-results', 'lab-results', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques de stockage pour le bucket lab-results
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Lab Results') THEN
        CREATE POLICY "Public Access Lab Results" ON storage.objects 
        FOR SELECT USING (bucket_id = 'lab-results');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload Lab Results') THEN
        CREATE POLICY "Allow upload Lab Results" ON storage.objects 
        FOR INSERT WITH CHECK (bucket_id = 'lab-results');
    END IF;
END $$;
