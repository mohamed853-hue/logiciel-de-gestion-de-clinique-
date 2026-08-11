-- =============================================================================
-- TABLE DES ACCOMPAGNANTS (MINI-DOSSIER)
-- Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- 2. CRÉATION DE LA TABLE DES ACCOMPAGNANTS
CREATE TABLE IF NOT EXISTS public.accompaniers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    relationship TEXT CHECK (relationship IN ('pere', 'mere', 'mari', 'femme', 'frere', 'soeur', 'proche', 'autre')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AJOUT D'UN CHAMP POUR LIER L'ACCOMPAGNANT AU PATIENT
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS accompanier_id TEXT REFERENCES public.accompaniers(id) ON DELETE SET NULL;

-- 4. CRÉATION D'INDEX POUR LES RECHERCHES
CREATE INDEX IF NOT EXISTS idx_accompaniers_phone ON public.accompaniers(phone);
CREATE INDEX IF NOT EXISTS idx_accompaniers_name ON public.accompaniers(first_name, last_name);

-- 4. RLS POLICIES (Row Level Security)
ALTER TABLE public.accompaniers ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre à tous les utilisateurs authentifiés de lire
DROP POLICY IF EXISTS "Accompaniers readable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers readable by authenticated"
    ON public.accompaniers FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy pour permettre à tous les utilisateurs authentifiés d'insérer
DROP POLICY IF EXISTS "Accompaniers insertable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers insertable by authenticated"
    ON public.accompaniers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy pour permettre à tous les utilisateurs authentifiés de mettre à jour
DROP POLICY IF EXISTS "Accompaniers updatable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers updatable by authenticated"
    ON public.accompaniers FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policy pour permettre à tous les utilisateurs authentifiés de supprimer
DROP POLICY IF EXISTS "Accompaniers deletable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers deletable by authenticated"
    ON public.accompaniers FOR DELETE
    USING (auth.role() = 'authenticated');

-- 6. RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Table accompagniers créée avec succès !';
    RAISE NOTICE '   → Champs : first_name, last_name, phone, address, relationship, notes';
    RAISE NOTICE '   → Champ accompanier_id ajouté à la table patients';
    RAISE NOTICE '   → Index créés pour les recherches';
    RAISE NOTICE '   → RLS policies activées pour les utilisateurs authentifiés';
END $$;
