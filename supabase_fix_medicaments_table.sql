-- ============================================================================
-- SCRIPT DE MISE À NIVEAU DE LA TABLE MEDICAMENTS (PUBLIC.MEDICAMENTS)
-- Exécutez ce script dans le SQL Editor de Supabase pour créer ou ajuster la table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medicaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cis TEXT UNIQUE,
    denomination TEXT NOT NULL,
    nom TEXT,
    dosage TEXT,
    forme TEXT,
    voie_administration TEXT,
    laboratoire TEXT,
    substance_active TEXT,
    statut TEXT DEFAULT 'Autorisé',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sécurité : Ajoute automatiquement toute colonne manquante si la table existait déjà
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS cis TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS denomination TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS dosage TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS forme TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS voie_administration TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS laboratoire TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS substance_active TEXT;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'Autorisé';
