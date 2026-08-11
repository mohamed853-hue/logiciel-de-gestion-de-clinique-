-- =============================================================================
-- MODULE ACCUEIL : FILE D'ATTENTE DU JOUR
-- Copiez ce code et exécutez-le dans le SQL Editor de Supabase
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.file_attente_accueil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_nom TEXT NOT NULL,
    destination TEXT NOT NULL, -- 'medecin', 'gyneco', 'labo', 'infirmerie'
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_consultation', 'termine', 'annule')),
    notes TEXT,
    arrivee_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation de la sécurité RLS
ALTER TABLE public.file_attente_accueil ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Politique de lecture
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read file_attente_accueil') THEN
        CREATE POLICY "Allow public read file_attente_accueil" ON public.file_attente_accueil FOR SELECT USING (true);
    END IF;
    
    -- Politique d'écriture
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write file_attente_accueil') THEN
        CREATE POLICY "Allow public write file_attente_accueil" ON public.file_attente_accueil FOR ALL USING (true);
    END IF;
END $$;

-- Message de confirmation
DO $$ BEGIN RAISE NOTICE 'Table de file d''attente d''accueil créée avec succès.'; END $$;
