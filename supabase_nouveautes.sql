-- =============================================================================
-- DEBUT DES NOUVELLES TABLES (MODULE PHARMACIE, LOTS, MOUVEMENTS & FACTURES)
-- Copiez tout le contenu de ce fichier et collez-le dans Supabase SQL Editor
-- =============================================================================

-- 1. CATALOGUE DES MÉDICAMENTS (pharmacy_medicaments)
CREATE TABLE IF NOT EXISTS public.pharmacy_medicaments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT UNIQUE,
    nom TEXT NOT NULL,
    forme TEXT,
    dosage TEXT,
    categorie TEXT DEFAULT 'Général',
    prix_achat_defaut NUMERIC(12,2) DEFAULT 0,
    prix_vente_defaut NUMERIC(12,2) DEFAULT 0,
    seuil_alerte INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STOCK PHARMACIE ET GESTION DES LOTS (pharmacy_stock)
CREATE TABLE IF NOT EXISTS public.pharmacy_stock (
    id TEXT PRIMARY KEY,
    medicament_id TEXT REFERENCES public.pharmacy_medicaments(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    qte INT NOT NULL DEFAULT 0,
    prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0,
    prix NUMERIC(12,2) NOT NULL DEFAULT 0,
    seuil INT NOT NULL DEFAULT 10,
    lot_num TEXT NOT NULL DEFAULT 'LOT-DEFAULT',
    expiry_date DATE,
    supplier TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la table pharmacy_stock existait déjà, ajouter la colonne prix_achat et medicament_id si absentes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='prix_achat') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN prix_achat NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='medicament_id') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN medicament_id TEXT;
    END IF;
END $$;

-- 3. HISTORIQUE DES MOUVEMENTS DE STOCK (pharmacy_movements)
CREATE TABLE IF NOT EXISTS public.pharmacy_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id TEXT REFERENCES public.pharmacy_stock(id) ON DELETE SET NULL,
    medicament_nom TEXT NOT NULL,
    lot_num TEXT,
    type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('achat', 'vente', 'annulation_vente', 'remboursement', 'ajustement', 'perte')),
    qte INT NOT NULL,
    prix_unitaire NUMERIC(12,2) DEFAULT 0,
    montant_total NUMERIC(12,2) DEFAULT 0,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
    user_id TEXT,
    user_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MISE À JOUR DE LA TABLE TRANSACTIONS (Statut annulation/remboursement)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE public.transactions ADD COLUMN status TEXT DEFAULT 'validee';
    END IF;
END $$;

-- 5. HISTORIQUE DES FACTURES (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE SET NULL,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    type TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    montant_total NUMERIC(12,2) NOT NULL,
    statut TEXT DEFAULT 'payee' CHECK (statut IN ('payee', 'annulee', 'remboursee')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. GYNÉCOLOGIE : SUIVI DE GROSSESSE & ACCOUCHEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gyn_grossesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    date_debut_grossesse DATE NOT NULL,
    date_terme_prevu DATE NOT NULL,
    statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'accouchee', 'interrompue')),
    nombre_foetus INT DEFAULT 1,
    remarques TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gyn_accouchements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grossesse_id UUID REFERENCES public.gyn_grossesses(id) ON DELETE SET NULL,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    date_accouchement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type_accouchement TEXT DEFAULT 'voie_basse' CHECK (type_accouchement IN ('voie_basse', 'cesarienne')),
    sexe_bebe TEXT,
    poids_bebe_grammes INT,
    observations TEXT,
    medecin_nom TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. CAISSE : DÉPENSES & DÉCAISSEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.caisse_depenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_depense TIMESTAMPTZ DEFAULT NOW(),
    categorie TEXT NOT NULL,
    description TEXT NOT NULL,
    montant NUMERIC(12,2) NOT NULL,
    mode_paiement TEXT DEFAULT 'Espèces',
    enregistre_par TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. ACCUEIL : FILE D'ATTENTE DU JOUR
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

-- =============================================================================
-- 9. ORDONNANCES : BOUTONS IMPRESSION ET ENVOI PHARMACIE
-- =============================================================================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordonnances' AND column_name='envoye_pharmacie') THEN
        ALTER TABLE public.ordonnances ADD COLUMN envoye_pharmacie BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordonnances' AND column_name='imprimee') THEN
        ALTER TABLE public.ordonnances ADD COLUMN imprimee BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =============================================================================
-- POLITIQUES DE SÉCURITÉ ET ACCÈS RLS SUR LES NOUVELLES TABLES
-- =============================================================================
ALTER TABLE public.pharmacy_medicaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyn_grossesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyn_accouchements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caisse_depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attente_accueil ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pharmacy_medicaments') THEN
        CREATE POLICY "Allow public read pharmacy_medicaments" ON public.pharmacy_medicaments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write pharmacy_medicaments') THEN
        CREATE POLICY "Allow public write pharmacy_medicaments" ON public.pharmacy_medicaments FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pharmacy_movements') THEN
        CREATE POLICY "Allow public read pharmacy_movements" ON public.pharmacy_movements FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write pharmacy_movements') THEN
        CREATE POLICY "Allow public write pharmacy_movements" ON public.pharmacy_movements FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read invoices') THEN
        CREATE POLICY "Allow public read invoices" ON public.invoices FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write invoices') THEN
        CREATE POLICY "Allow public write invoices" ON public.invoices FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read gyn_grossesses') THEN
        CREATE POLICY "Allow public read gyn_grossesses" ON public.gyn_grossesses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write gyn_grossesses') THEN
        CREATE POLICY "Allow public write gyn_grossesses" ON public.gyn_grossesses FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read gyn_accouchements') THEN
        CREATE POLICY "Allow public read gyn_accouchements" ON public.gyn_accouchements FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write gyn_accouchements') THEN
        CREATE POLICY "Allow public write gyn_accouchements" ON public.gyn_accouchements FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read caisse_depenses') THEN
        CREATE POLICY "Allow public read caisse_depenses" ON public.caisse_depenses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write caisse_depenses') THEN
        CREATE POLICY "Allow public write caisse_depenses" ON public.caisse_depenses FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read file_attente_accueil') THEN
        CREATE POLICY "Allow public read file_attente_accueil" ON public.file_attente_accueil FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write file_attente_accueil') THEN
        CREATE POLICY "Allow public write file_attente_accueil" ON public.file_attente_accueil FOR ALL USING (true);
    END IF;
END $$;

-- =============================================================================
-- FIN DES NOUVELLES TABLES
-- =============================================================================

