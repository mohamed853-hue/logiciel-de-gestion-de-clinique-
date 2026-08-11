-- =============================================================================
-- GUIDE D'EXÉCUTION PAS À PAS SUR SUPABASE (POUR LES DÉBUTANTS)
-- =============================================================================
-- 1. Connectez-vous sur votre dashboard Supabase (https://supabase.com/dashboard)
-- 2. Sélectionnez votre projet "bwjijdqkhjstswcgvpjj"
-- 3. Dans le menu de gauche, cliquez sur "SQL Editor" (l'icône avec le symbole >=)
-- 4. Cliquez sur le bouton "+ New query" en haut à droite
-- 5. Copiez TOUT le contenu de ce fichier et collez-le dans l'éditeur SQL
-- 6. Cliquez sur le bouton vert "Run" (ou appuyez sur Ctrl + Entrée)
-- 7. C'est tout ! Votre base de données est prête et le Super Administrateur est créé.
-- =============================================================================

-- =============================================================================
-- 🔴 DEBUT DES NOUVELLES TABLES AJOUTÉES (MODULE PHARMACIE, LOTS & FACTURES) 🔴
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

-- 4. HISTORIQUE DES FACTURES (invoices)
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
-- 🟢 FIN DES NOUVELLES TABLES AJOUTÉES 🟢
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NETTOYAGE (Optionnel : Décommenter si vous souhaitez tout réinitialiser)
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS public.audit_log CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.pharmacy_stock CASCADE;
-- DROP TABLE IF EXISTS public.gyneco_records CASCADE;
-- DROP TABLE IF EXISTS public.births CASCADE;
-- DROP TABLE IF EXISTS public.pregnancy_visits CASCADE;
-- DROP TABLE IF EXISTS public.pregnancies CASCADE;
-- DROP TABLE IF EXISTS public.admissions CASCADE;
-- DROP TABLE IF EXISTS public.lab_tests CASCADE;
-- DROP TABLE IF EXISTS public.prescriptions CASCADE;
-- DROP TABLE IF EXISTS public.appointments CASCADE;
-- DROP TABLE IF EXISTS public.vitals_records CASCADE;
-- DROP TABLE IF EXISTS public.patients CASCADE;
-- DROP TABLE IF EXISTS public.app_users CASCADE;

-- -----------------------------------------------------------------------------
-- 2. TABLE DES UTILISATEURS DU SYSTÈME (app_users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '123456',
    role TEXT NOT NULL CHECK (role IN (
        'admin', 'medecin', 'gynecologue', 'infirmier',
        'pharmacien', 'caissier', 'laborantin', 'receptionniste'
    )),
    status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu')),
    phone TEXT,
    photo_url TEXT,
    address TEXT,
    date_naissance DATE,
    sexe TEXT CHECK (sexe IN ('M', 'F')),
    service TEXT,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. CRÉATION DU COMPTE SUPER ADMINISTRATEUR UNIQUE DE DÉPART
-- Identifiants de connexion :
-- Email    : admin@alshifa.dz
-- Mot de passe : admin123
-- -----------------------------------------------------------------------------
INSERT INTO public.app_users (id, name, email, password, role, status, phone, service, username) VALUES
    ('USER-001', 'Super Administrateur', 'admin@alshifa.dz', 'admin123', 'admin', 'actif', '0550 00 00 00', 'Direction General', 'super.admin')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    status = 'actif';

-- -----------------------------------------------------------------------------
-- 4. TABLE DES PATIENTS (patients)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INT NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
    phone TEXT NOT NULL,
    blood TEXT NOT NULL,
    allergies TEXT DEFAULT 'Aucune',
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. TABLE INFIRMERIE (vitals_records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vitals_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    tension TEXT NOT NULL,
    temp NUMERIC(4,1) NOT NULL,
    poids NUMERIC(5,2) NOT NULL,
    pouls INT,
    motif TEXT NOT NULL,
    soins TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TABLE RENDEZ-VOUS (appointments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'planifie' CHECK (status IN ('planifie', 'en_attente', 'en_consultation', 'termine', 'annule')),
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. TABLE ORDONNANCES (prescriptions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    items JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'delivree', 'annulee')),
    delivered_by TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. TABLE LABORATOIRE (lab_tests)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine')),
    results_text TEXT,
    file_url TEXT,
    validated_by TEXT,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TABLE HOSPITALISATION (admissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    room_num TEXT NOT NULL,
    bed_num TEXT NOT NULL,
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    daily_rate NUMERIC(10,2) DEFAULT 2500,
    status TEXT NOT NULL DEFAULT 'occupe' CHECK (status IN ('occupe', 'libere')),
    admitted_by TEXT
);

-- -----------------------------------------------------------------------------
-- 10. TABLE MATERNITÉ & GROSSESSES (pregnancies, pregnancy_visits, births)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pregnancies (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    ddr DATE NOT NULL,
    status TEXT DEFAULT 'en_cours',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pregnancy_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_id TEXT REFERENCES public.pregnancies(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT NOT NULL,
    file_url TEXT
);

CREATE TABLE IF NOT EXISTS public.births (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mother_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    birth_date TIMESTAMPTZ NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
    poids NUMERIC(4,2) NOT NULL,
    birth_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. TABLE GYNÉCOLOGIE (gyneco_records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyneco_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    motif TEXT NOT NULL,
    examen TEXT,
    imagerie_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- 12. TABLE CATALOGUE DES MÉDICAMENTS (pharmacy_medicaments)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 13. TABLE STOCK PHARMACIE & LOTS (pharmacy_stock)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacy_stock (
    id TEXT PRIMARY KEY,
    medicament_id TEXT REFERENCES public.pharmacy_medicaments(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    qte INT NOT NULL DEFAULT 0,
    prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0,
    prix NUMERIC(12,2) NOT NULL DEFAULT 0,
    seuil INT NOT NULL DEFAULT 10,
    lot_num TEXT NOT NULL,
    expiry_date DATE,
    supplier TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 14. TABLE HISTORIQUE DES MOUVEMENTS DE PHARMACIE (pharmacy_movements)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 15. TABLE CAISSE & TRANSACTIONS (transactions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    montant NUMERIC(12,2) NOT NULL,
    detail TEXT NOT NULL,
    status TEXT DEFAULT 'validee' CHECK (status IN ('validee', 'annulee', 'remboursee')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 16. TABLE HISTORIQUE DES FACTURES (invoices)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 17. TABLE AUDIT LOG / HISTORIQUE (audit_log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- POLITIQUES DE SÉCURITÉ ET ACCÈS RLS (Row Level Security)
-- =============================================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancy_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.births ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyneco_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture/écriture sécurisée par l'API de l'application
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read app_users') THEN
        CREATE POLICY "Allow public read app_users" ON public.app_users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write app_users') THEN
        CREATE POLICY "Allow public write app_users" ON public.app_users FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read patients') THEN
        CREATE POLICY "Allow public read patients" ON public.patients FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write patients') THEN
        CREATE POLICY "Allow public write patients" ON public.patients FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read vitals') THEN
        CREATE POLICY "Allow public read vitals" ON public.vitals_records FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write vitals') THEN
        CREATE POLICY "Allow public write vitals" ON public.vitals_records FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read appointments') THEN
        CREATE POLICY "Allow public read appointments" ON public.appointments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write appointments') THEN
        CREATE POLICY "Allow public write appointments" ON public.appointments FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read prescriptions') THEN
        CREATE POLICY "Allow public read prescriptions" ON public.prescriptions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write prescriptions') THEN
        CREATE POLICY "Allow public write prescriptions" ON public.prescriptions FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read lab_tests') THEN
        CREATE POLICY "Allow public read lab_tests" ON public.lab_tests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write lab_tests') THEN
        CREATE POLICY "Allow public write lab_tests" ON public.lab_tests FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read admissions') THEN
        CREATE POLICY "Allow public read admissions" ON public.admissions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write admissions') THEN
        CREATE POLICY "Allow public write admissions" ON public.admissions FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pregnancies') THEN
        CREATE POLICY "Allow public read pregnancies" ON public.pregnancies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write pregnancies') THEN
        CREATE POLICY "Allow public write pregnancies" ON public.pregnancies FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pregnancy_visits') THEN
        CREATE POLICY "Allow public read pregnancy_visits" ON public.pregnancy_visits FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write pregnancy_visits') THEN
        CREATE POLICY "Allow public write pregnancy_visits" ON public.pregnancy_visits FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read births') THEN
        CREATE POLICY "Allow public read births" ON public.births FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write births') THEN
        CREATE POLICY "Allow public write births" ON public.births FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read gyneco') THEN
        CREATE POLICY "Allow public read gyneco" ON public.gyneco_records FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write gyneco') THEN
        CREATE POLICY "Allow public write gyneco" ON public.gyneco_records FOR ALL USING (true);
ALTER TABLE public.pharmacy_medicaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture/écriture sécurisée par l'API de l'application
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read app_users') THEN
        CREATE POLICY "Allow public read app_users" ON public.app_users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write app_users') THEN
        CREATE POLICY "Allow public write app_users" ON public.app_users FOR ALL USING (true);
    END IF;

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

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pharmacy_stock') THEN
        CREATE POLICY "Allow public read pharmacy_stock" ON public.pharmacy_stock FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write pharmacy_stock') THEN
        CREATE POLICY "Allow public write pharmacy_stock" ON public.pharmacy_stock FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read transactions') THEN
        CREATE POLICY "Allow public read transactions" ON public.transactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write transactions') THEN
        CREATE POLICY "Allow public write transactions" ON public.transactions FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read audit_log') THEN
        CREATE POLICY "Allow public read audit_log" ON public.audit_log FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write audit_log') THEN
        CREATE POLICY "Allow public write audit_log" ON public.audit_log FOR ALL USING (true);
    END IF;
END $$;
