-- =============================================================================
-- AL SHIFA — SQL COMPLÉMENTAIRE (Ajustements de schéma & Tables manquantes)
-- Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- 1. Assouplir les contraintes NOT NULL sur la table patients (pour éviter tout échec à l'enregistrement)
ALTER TABLE public.patients 
  ALTER COLUMN age DROP NOT NULL,
  ALTER COLUMN sex DROP NOT NULL,
  ALTER COLUMN blood DROP NOT NULL;

-- 2. Ajouter les colonnes manquantes à la table patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS visit_reason TEXT DEFAULT 'Consultation',
  ADD COLUMN IF NOT EXISTS patient_number TEXT,
  ADD COLUMN IF NOT EXISTS arrival_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS arrival_status TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accompanier_id TEXT;

-- Index d'optimisation des recherches de patients
CREATE INDEX IF NOT EXISTS idx_patients_number ON public.patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_arrival_status ON public.patients(arrival_status);

-- 3. Table accompaniers (Accompagnants) & Assouplissement de la contrainte relationship
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

ALTER TABLE public.accompaniers DROP CONSTRAINT IF EXISTS accompaniers_relationship_check;

-- 4. Enrichir la table appointments (Rendez-vous)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'consultation';

-- 5. Enrichir la table transactions (Caisse)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'caisse';

-- 6. Table lab_requests (Demandes d'analyses groupées)
CREATE TABLE IF NOT EXISTS public.lab_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule')),
  clinical_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table lab_request_items (Examens individuels d'une demande)
CREATE TABLE IF NOT EXISTS public.lab_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_request_id UUID REFERENCES public.lab_requests(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT DEFAULT 'biologie',
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine')),
  result TEXT,
  result_value TEXT,
  unit TEXT,
  reference_range TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table nursing_tasks (Tâches infirmières)
CREATE TABLE IF NOT EXISTS public.nursing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
  nurse_name TEXT,
  doctor_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('injection', 'pansement', 'perfusion', 'constantes', 'soin_plaie', 'autre')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('basse', 'normal', 'haute', 'urgente')),
  is_billable BOOLEAN DEFAULT false,
  price NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Table notifications (Notifications inter-modules)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL,
  recipient_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Politiques de Sécurité RLS
ALTER TABLE public.accompaniers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read accompaniers') THEN
    CREATE POLICY "Allow public read accompaniers" ON public.accompaniers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write accompaniers') THEN
    CREATE POLICY "Allow public write accompaniers" ON public.accompaniers FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read lab_requests') THEN
    CREATE POLICY "Allow public read lab_requests" ON public.lab_requests FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write lab_requests') THEN
    CREATE POLICY "Allow public write lab_requests" ON public.lab_requests FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read lab_request_items') THEN
    CREATE POLICY "Allow public read lab_request_items" ON public.lab_request_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write lab_request_items') THEN
    CREATE POLICY "Allow public write lab_request_items" ON public.lab_request_items FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read nursing_tasks') THEN
    CREATE POLICY "Allow public read nursing_tasks" ON public.nursing_tasks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write nursing_tasks') THEN
    CREATE POLICY "Allow public write nursing_tasks" ON public.nursing_tasks FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read notifications') THEN
    CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write notifications') THEN
    CREATE POLICY "Allow public write notifications" ON public.notifications FOR ALL USING (true);
  END IF;
END $$;
