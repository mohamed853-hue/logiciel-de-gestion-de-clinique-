-- =============================================================================
-- SCRIPT DE RÉPARATION & SYNCHRONISATION PHARMACIE & CAISSE AL SHIFA
-- Ce script synchronise 'nom' et 'medicine_name', 'prix_unitaire' et 'sale_price'
-- et crée toutes les tables et colonnes nécessaires sans conflit de types.
-- =============================================================================

-- 1. CRÉATION OU MISE À JOUR DE LA TABLE PHARMACY_STOCK
CREATE TABLE IF NOT EXISTS public.pharmacy_stock (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    medicine_name TEXT,
    nom TEXT,
    medicine_code TEXT,
    barcode TEXT,
    category TEXT DEFAULT 'Antalgiques / Antipyrétiques',
    laboratory TEXT,
    supplier TEXT,
    supplier_phone TEXT,
    quantity_available DECIMAL(10, 2) DEFAULT 0,
    quantite DECIMAL(10, 2) DEFAULT 0,
    minimum_threshold DECIMAL(10, 2) DEFAULT 5,
    seuil_alerte DECIMAL(10, 2) DEFAULT 5,
    purchase_price DECIMAL(12, 2) DEFAULT 0,
    prix_achat DECIMAL(12, 2) DEFAULT 0,
    sale_price DECIMAL(12, 2) DEFAULT 0,
    prix_unitaire DECIMAL(12, 2) DEFAULT 0,
    lot_number TEXT,
    entry_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    date_expiration DATE,
    location TEXT DEFAULT 'Rayon A1',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter toutes les colonnes à pharmacy_stock si elle existait déjà
DO $$
BEGIN
    ALTER TABLE public.pharmacy_stock ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='medicine_name') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN medicine_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='nom') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN nom TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='medicine_code') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN medicine_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='barcode') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN barcode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='category') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN category TEXT DEFAULT 'Antalgiques / Antipyrétiques';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='laboratory') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN laboratory TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='supplier') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN supplier TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='supplier_phone') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN supplier_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='quantity_available') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN quantity_available DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='quantite') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN quantite DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='minimum_threshold') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN minimum_threshold DECIMAL(10, 2) DEFAULT 5;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='purchase_price') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN purchase_price DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='prix_achat') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN prix_achat DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='sale_price') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN sale_price DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='prix_unitaire') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN prix_unitaire DECIMAL(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='lot_number') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN lot_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='entry_date') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN entry_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='expiration_date') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN expiration_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='date_expiration') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN date_expiration DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='location') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN location TEXT DEFAULT 'Rayon A1';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacy_stock' AND column_name='is_active') THEN
        ALTER TABLE public.pharmacy_stock ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Synchroniser les colonnes existantes si nécessaire
UPDATE public.pharmacy_stock 
SET medicine_name = COALESCE(medicine_name, nom, 'Médicament'),
    nom = COALESCE(nom, medicine_name, 'Médicament'),
    sale_price = COALESCE(sale_price, prix_unitaire, 0),
    prix_unitaire = COALESCE(prix_unitaire, sale_price, 0),
    purchase_price = COALESCE(purchase_price, prix_achat, 0),
    prix_achat = COALESCE(prix_achat, purchase_price, 0),
    quantity_available = COALESCE(quantity_available, quantite, 0),
    quantite = COALESCE(quantite, quantity_available, 0)
WHERE medicine_name IS NULL OR nom IS NULL;

-- 2. TABLE TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reference TEXT,
    patient_id TEXT,
    type TEXT NOT NULL DEFAULT 'Facture',
    montant NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(12,2) DEFAULT 0,
    detail TEXT,
    payment_method TEXT DEFAULT 'Espèces',
    source TEXT DEFAULT 'caisse_centrale',
    source_reference TEXT,
    status TEXT DEFAULT 'validee',
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.transactions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='reference') THEN
        ALTER TABLE public.transactions ADD COLUMN reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='amount') THEN
        ALTER TABLE public.transactions ADD COLUMN amount NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='payment_method') THEN
        ALTER TABLE public.transactions ADD COLUMN payment_method TEXT DEFAULT 'Espèces';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='source') THEN
        ALTER TABLE public.transactions ADD COLUMN source TEXT DEFAULT 'caisse_centrale';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='source_reference') THEN
        ALTER TABLE public.transactions ADD COLUMN source_reference TEXT;
    END IF;
END $$;

-- 3. TABLE VENTES PHARMACIE (pharmacy_sales)
CREATE TABLE IF NOT EXISTS public.pharmacy_sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reference TEXT UNIQUE NOT NULL,
    patient_id TEXT,
    prescription_id TEXT,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Espèces',
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    sold_by TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE LIGNES DE VENTE (pharmacy_sale_items)
CREATE TABLE IF NOT EXISTS public.pharmacy_sale_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id TEXT NOT NULL,
    stock_id TEXT,
    medicine_name TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE ENTRÉES DE STOCK (pharmacy_stock_entries)
CREATE TABLE IF NOT EXISTS public.pharmacy_stock_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reference TEXT UNIQUE NOT NULL,
    stock_id TEXT,
    supplier TEXT,
    supplier_phone TEXT,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    lot_number TEXT,
    entry_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    received_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE FACTURATION SOINS (patient_care_billing)
CREATE TABLE IF NOT EXISTS public.patient_care_billing (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    care_title TEXT NOT NULL,
    care_code TEXT,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'en_attente',
    prescribed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SÉCURITÉ RLS (Tout autoriser pour l'application)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_care_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all transactions" ON public.transactions;
CREATE POLICY "Allow all transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all patient_care_billing" ON public.patient_care_billing;
CREATE POLICY "Allow all patient_care_billing" ON public.patient_care_billing FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all pharmacy_stock" ON public.pharmacy_stock;
CREATE POLICY "Allow all pharmacy_stock" ON public.pharmacy_stock FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all pharmacy_sales" ON public.pharmacy_sales;
CREATE POLICY "Allow all pharmacy_sales" ON public.pharmacy_sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all pharmacy_sale_items" ON public.pharmacy_sale_items;
CREATE POLICY "Allow all pharmacy_sale_items" ON public.pharmacy_sale_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all pharmacy_stock_entries" ON public.pharmacy_stock_entries;
CREATE POLICY "Allow all pharmacy_stock_entries" ON public.pharmacy_stock_entries FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
