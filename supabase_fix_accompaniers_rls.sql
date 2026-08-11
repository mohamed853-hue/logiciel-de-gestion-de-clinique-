-- =============================================================================
-- CORRECTION POLITIQUES RLS POUR TABLE ACCOMPAGNERS
-- Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- Désactiver RLS temporairement pour permettre les opérations
ALTER TABLE public.accompaniers DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE public.accompaniers ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre à tous les utilisateurs authentifiés de lire
DROP POLICY IF EXISTS "Accompaniers readable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers readable by authenticated"
    ON public.accompaniers FOR SELECT
    USING (true);

-- Policy pour permettre à tous les utilisateurs authentifiés d'insérer
DROP POLICY IF EXISTS "Accompaniers insertable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers insertable by authenticated"
    ON public.accompaniers FOR INSERT
    WITH CHECK (true);

-- Policy pour permettre à tous les utilisateurs authentifiés de mettre à jour
DROP POLICY IF EXISTS "Accompaniers updatable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers updatable by authenticated"
    ON public.accompaniers FOR UPDATE
    USING (true);

-- Policy pour permettre à tous les utilisateurs authentifiés de supprimer
DROP POLICY IF EXISTS "Accompaniers deletable by authenticated" ON public.accompaniers;
CREATE POLICY "Accompaniers deletable by authenticated"
    ON public.accompaniers FOR DELETE
    USING (true);

-- RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Politiques RLS corrigées avec succès !';
    RAISE NOTICE '   → Les utilisateurs authentifiés peuvent maintenant lire, insérer, mettre à jour et supprimer des accompagniers';
END $$;
