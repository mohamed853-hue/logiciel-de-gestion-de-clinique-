-- =============================================================================
-- TABLE: PARAMÈTRES GÉNÉRAUX & TARIFICATION DE LA CLINIQUE (clinic_settings)
-- Exécutez ce script dans l'éditeur SQL de votre Dashboard Supabase
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    clinic_name TEXT NOT NULL DEFAULT 'Clinique Médicale AL SHIFA',
    clinic_phone TEXT DEFAULT '+222 45 00 00 00',
    country TEXT DEFAULT 'Mauritanie',
    city TEXT DEFAULT 'Nouakchott',
    clinic_address TEXT DEFAULT 'Avenue Principale, Centre Ville',
    clinic_email TEXT DEFAULT 'contact@clinique-alshifa.com',
    currency TEXT DEFAULT 'FCFA',
    logo_url TEXT DEFAULT '/logo.jpg',
    receipt_footer_note TEXT DEFAULT 'Merci de votre confiance. Bon rétablissement avec l''aide d''Allah.',
    receipt_format TEXT DEFAULT 'thermal_80mm' CHECK (receipt_format IN ('thermal_80mm', 'standard_a4')),
    
    -- Tarifs des Consultations par défaut (FCFA)
    consultation_general NUMERIC(12,2) DEFAULT 5000,
    consultation_specialist NUMERIC(12,2) DEFAULT 10000,
    consultation_emergency NUMERIC(12,2) DEFAULT 7500,
    consultation_control NUMERIC(12,2) DEFAULT 3000,
    
    -- Tarifs des Chambres & Hospitalisations par défaut (FCFA / jour)
    room_simple NUMERIC(12,2) DEFAULT 15000,
    room_double NUMERIC(12,2) DEFAULT 10000,
    room_vip NUMERIC(12,2) DEFAULT 25000,
    room_intensive NUMERIC(12,2) DEFAULT 40000,
    room_observation NUMERIC(12,2) DEFAULT 7500,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion de la configuration initiale unique (Singleton)
INSERT INTO public.clinic_settings (
    id, clinic_name, clinic_phone, country, city, clinic_address, clinic_email,
    currency, logo_url, receipt_footer_note, receipt_format,
    consultation_general, consultation_specialist, consultation_emergency, consultation_control,
    room_simple, room_double, room_vip, room_intensive, room_observation
) VALUES (
    'default',
    'Clinique Médicale AL SHIFA',
    '+222 45 00 00 00',
    'Mauritanie',
    'Nouakchott',
    'Avenue Principale, Centre Ville',
    'contact@clinique-alshifa.com',
    'FCFA',
    '/logo.jpg',
    'Merci de votre confiance. Bon rétablissement avec l''aide d''Allah.',
    'thermal_80mm',
    5000, 10000, 7500, 3000,
    15000, 10000, 25000, 40000, 7500
) ON CONFLICT (id) DO NOTHING;

-- Permissions pour les rôles Supabase
GRANT ALL ON TABLE public.clinic_settings TO anon, authenticated, service_role;

-- Activation de la sécurité RLS (Row Level Security)
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture et d'écriture complètes pour l'application
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read clinic_settings" ON public.clinic_settings;
    DROP POLICY IF EXISTS "Allow public write clinic_settings" ON public.clinic_settings;
    DROP POLICY IF EXISTS "Allow public insert clinic_settings" ON public.clinic_settings;
    DROP POLICY IF EXISTS "Allow public update clinic_settings" ON public.clinic_settings;

    CREATE POLICY "Allow public read clinic_settings" 
        ON public.clinic_settings 
        FOR SELECT 
        USING (true);

    CREATE POLICY "Allow public write clinic_settings" 
        ON public.clinic_settings 
        FOR ALL 
        USING (true)
        WITH CHECK (true);
END $$;
