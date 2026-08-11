-- =============================================================================
-- SYSTÈME FINANCIER AL SHIFA - BASE DE DONNÉES
-- Exécutez ce fichier dans le SQL Editor de Supabase
-- =============================================================================

-- =============================================================================
-- TABLE: TRANSACTIONS (Journal financier central)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('revenue', 'expense', 'adjustment', 'refund')),
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('pharmacy', 'consultation', 'gynecology', 'laboratory', 'nursing', 'cashier', 'other')),
    source_reference VARCHAR(50), -- Référence de la source (ex: FAC-001245, VTE-000521)
    status VARCHAR(50) NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'pending', 'cancelled', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON public.transactions(patient_id);

-- RLS pour transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions readable by authenticated" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Transactions insertable by authenticated" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Transactions updatable by authenticated" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Transactions deletable by admin" ON public.transactions FOR DELETE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);

-- =============================================================================
-- TABLE: FACTURES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total - paid_amount) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    notes TEXT,
    created_by UUID NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_reference ON public.invoices(reference);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices readable by authenticated" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Invoices insertable by authenticated" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Invoices updatable by authenticated" ON public.invoices FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: LIGNES FACTURE (Invoice Items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('service', 'product', 'medicine')),
    item_id UUID, -- Référence au service/produit/médicament
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice items readable by authenticated" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Invoice items insertable by authenticated" ON public.invoice_items FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: PAIEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    processed_by UUID NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments readable by authenticated" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Payments insertable by authenticated" ON public.payments FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: REÇUS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    printed BOOLEAN DEFAULT FALSE,
    printed_by UUID,
    printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_reference ON public.receipts(reference);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.receipts(invoice_id);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receipts readable by authenticated" ON public.receipts FOR SELECT USING (true);
CREATE POLICY "Receipts insertable by authenticated" ON public.receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Receipts updatable by authenticated" ON public.receipts FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: DÉPENSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('supplier', 'medical_equipment', 'maintenance', 'supplies', 'salary', 'other')),
    supplier VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    justification VARCHAR(255), -- Chemin vers le justificatif
    user_id UUID NOT NULL DEFAULT auth.uid(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_reference ON public.expenses(reference);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses readable by authenticated" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Expenses insertable by authenticated" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Expenses updatable by authenticated" ON public.expenses FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: REMBOURSEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    original_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    original_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    original_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    refund_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by UUID NOT NULL DEFAULT auth.uid(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_reference ON public.refunds(reference);
CREATE INDEX IF NOT EXISTS idx_refunds_invoice ON public.refunds(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_refunds_patient ON public.refunds(patient_id);
CREATE INDEX IF NOT EXISTS idx_refunds_date ON public.refunds(refund_date DESC);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Refunds readable by authenticated" ON public.refunds FOR SELECT USING (true);
CREATE POLICY "Refunds insertable by authenticated" ON public.refunds FOR INSERT WITH CHECK (true);
CREATE POLICY "Refunds updatable by authenticated" ON public.refunds FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: STOCK PHARMACIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_name VARCHAR(255) NOT NULL,
    medicine_code VARCHAR(50) UNIQUE,
    barcode VARCHAR(100),
    category VARCHAR(100),
    laboratory VARCHAR(255),
    supplier VARCHAR(255),
    quantity_available DECIMAL(10, 2) NOT NULL DEFAULT 0,
    minimum_threshold DECIMAL(10, 2) NOT NULL DEFAULT 10,
    purchase_price DECIMAL(12, 2) NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    lot_number VARCHAR(100),
    expiration_date DATE,
    location VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_code ON public.pharmacy_stock(medicine_code);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_barcode ON public.pharmacy_stock(barcode);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_category ON public.pharmacy_stock(category);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_expiration ON public.pharmacy_stock(expiration_date);

ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy stock readable by authenticated" ON public.pharmacy_stock FOR SELECT USING (true);
CREATE POLICY "Pharmacy stock insertable by authenticated" ON public.pharmacy_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "Pharmacy stock updatable by authenticated" ON public.pharmacy_stock FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: VENTES PHARMACIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    prescription_id UUID, -- Référence à l'ordonnance si applicable
    total_amount DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_by UUID NOT NULL DEFAULT auth.uid(),
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_reference ON public.pharmacy_sales(reference);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_patient ON public.pharmacy_sales(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_date ON public.pharmacy_sales(sale_date DESC);

ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy sales readable by authenticated" ON public.pharmacy_sales FOR SELECT USING (true);
CREATE POLICY "Pharmacy sales insertable by authenticated" ON public.pharmacy_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Pharmacy sales updatable by authenticated" ON public.pharmacy_sales FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: LIGNES VENTE PHARMACIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.pharmacy_sales(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES public.pharmacy_stock(id),
    medicine_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_sale_items_sale ON public.pharmacy_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sale_items_stock ON public.pharmacy_sale_items(stock_id);

ALTER TABLE public.pharmacy_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy sale items readable by authenticated" ON public.pharmacy_sale_items FOR SELECT USING (true);
CREATE POLICY "Pharmacy sale items insertable by authenticated" ON public.pharmacy_sale_items FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: ENTRÉES STOCK PHARMACIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_stock_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    stock_id UUID NOT NULL REFERENCES public.pharmacy_stock(id),
    supplier VARCHAR(255),
    quantity DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(12, 2) NOT NULL,
    lot_number VARCHAR(100),
    expiration_date DATE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_entries_reference ON public.pharmacy_stock_entries(reference);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_entries_stock ON public.pharmacy_stock_entries(stock_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_entries_date ON public.pharmacy_stock_entries(entry_date DESC);

ALTER TABLE public.pharmacy_stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock entries readable by authenticated" ON public.pharmacy_stock_entries FOR SELECT USING (true);
CREATE POLICY "Stock entries insertable by authenticated" ON public.pharmacy_stock_entries FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: ORDONNANCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL DEFAULT auth.uid(),
    doctor_name VARCHAR(255),
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_delivered', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_reference ON public.prescriptions(reference);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions(prescription_date DESC);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prescriptions readable by authenticated" ON public.prescriptions FOR SELECT USING (true);
CREATE POLICY "Prescriptions insertable by authenticated" ON public.prescriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Prescriptions updatable by authenticated" ON public.prescriptions FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: LIGNES ORDONNANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(255),
    quantity DECIMAL(10, 2) NOT NULL,
    instructions TEXT,
    delivered_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON public.prescription_items(prescription_id);

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prescription items readable by authenticated" ON public.prescription_items FOR SELECT USING (true);
CREATE POLICY "Prescription items insertable by authenticated" ON public.prescription_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Prescription items updatable by authenticated" ON public.prescription_items FOR UPDATE USING (true);

-- =============================================================================
-- TABLE: HISTORIQUE STOCK PHARMACIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_stock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES public.pharmacy_stock(id),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('entry', 'sale', 'return', 'adjustment', 'expiration', 'transfer')),
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_before DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2) NOT NULL,
    reference VARCHAR(50), -- Référence de l'opération (ex: VTE-000521, ENT-000123)
    user_id UUID NOT NULL DEFAULT auth.uid(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_history_stock ON public.pharmacy_stock_history(stock_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_history_type ON public.pharmacy_stock_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_history_date ON public.pharmacy_stock_history(created_at DESC);

ALTER TABLE public.pharmacy_stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock history readable by authenticated" ON public.pharmacy_stock_history FOR SELECT USING (true);
CREATE POLICY "Stock history insertable by authenticated" ON public.pharmacy_stock_history FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: JOURNAL D'AUDIT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2),
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_patient ON public.audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log readable by admin" ON public.audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);
CREATE POLICY "Audit log insertable by system" ON public.audit_log FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABLE: CLÔTURE DE CAISSE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cash_register_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    closure_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    expected_cash DECIMAL(12, 2) NOT NULL,
    expected_card DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expected_other DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expected_total DECIMAL(12, 2) GENERATED ALWAYS AS (expected_cash + expected_card + expected_other) STORED,
    actual_cash DECIMAL(12, 2) NOT NULL,
    actual_card DECIMAL(12, 2) NOT NULL DEFAULT 0,
    actual_other DECIMAL(12, 2) NOT NULL DEFAULT 0,
    actual_total DECIMAL(12, 2) GENERATED ALWAYS AS (actual_cash + actual_card + actual_other) STORED,
    variance_cash DECIMAL(12, 2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
    variance_total DECIMAL(12, 2) GENERATED ALWAYS AS (actual_total - expected_total) STORED,
    justification TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_closures_reference ON public.cash_register_closures(reference);
CREATE INDEX IF NOT EXISTS idx_cash_closures_date ON public.cash_register_closures(closure_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_closures_user ON public.cash_register_closures(user_id);

ALTER TABLE public.cash_register_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cash closures readable by authenticated" ON public.cash_register_closures FOR SELECT USING (true);
CREATE POLICY "Cash closures insertable by authenticated" ON public.cash_register_closures FOR INSERT WITH CHECK (true);
CREATE POLICY "Cash closures updatable by authenticated" ON public.cash_register_closures FOR UPDATE USING (true);

-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour générer une référence unique
CREATE OR REPLACE FUNCTION generate_reference(prefix VARCHAR(10))
RETURNS VARCHAR(20) AS $$
DECLARE
    new_ref VARCHAR(20);
    counter INTEGER;
BEGIN
    -- Trouver le dernier compteur pour ce préfixe
    SELECT COALESCE(MAX(CAST(SUBSTRING(reference, LENGTH(prefix) + 1) AS INTEGER)), 0) + 1
    INTO counter
    FROM (
        SELECT reference FROM transactions WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM invoices WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM payments WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM receipts WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM expenses WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM refunds WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM pharmacy_sales WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM pharmacy_stock_entries WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM prescriptions WHERE reference LIKE prefix || '%'
        UNION ALL
        SELECT reference FROM cash_register_closures WHERE reference LIKE prefix || '%'
    ) all_refs;
    
    new_ref := prefix || LPAD(counter::TEXT, 6, '0');
    RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour décrémenter le stock lors d'une vente
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pharmacy_stock
    SET quantity_available = quantity_available - NEW.quantity
    WHERE id = NEW.stock_id;
    
    -- Enregistrer dans l'historique
    INSERT INTO pharmacy_stock_history (
        stock_id, operation_type, quantity, quantity_before, quantity_after,
        reference, user_id, notes
    )
    SELECT 
        NEW.stock_id, 
        'sale', 
        NEW.quantity, 
        quantity_available, 
        quantity_available - NEW.quantity,
        (SELECT reference FROM pharmacy_sales WHERE id = NEW.sale_id),
        auth.uid(),
        'Vente: ' || NEW.medicine_name
    FROM pharmacy_stock
    WHERE id = NEW.stock_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_sale
AFTER INSERT ON pharmacy_sale_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_sale();

-- Trigger pour incrémenter le stock lors d'une entrée
CREATE OR REPLACE FUNCTION update_stock_on_entry()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pharmacy_stock
    SET quantity_available = quantity_available + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.stock_id;
    
    -- Enregistrer dans l'historique
    INSERT INTO pharmacy_stock_history (
        stock_id, operation_type, quantity, quantity_before, quantity_after,
        reference, user_id, notes
    )
    SELECT 
        NEW.stock_id, 
        'entry', 
        NEW.quantity, 
        quantity_available, 
        quantity_available + NEW.quantity,
        NEW.reference,
        NEW.user_id,
        'Entrée stock: ' || NEW.supplier
    FROM pharmacy_stock
    WHERE id = NEW.stock_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_entry
AFTER INSERT ON pharmacy_stock_entries
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_entry();

-- Trigger pour mettre à jour le statut de facture après paiement
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(12, 2);
    invoice_paid DECIMAL(12, 2);
BEGIN
    SELECT total, COALESCE(paid_amount, 0)
    INTO invoice_total, invoice_paid
    FROM invoices
    WHERE id = NEW.invoice_id;
    
    UPDATE invoices
    SET 
        paid_amount = invoice_paid + NEW.amount,
        status = CASE
            WHEN invoice_paid + NEW.amount >= invoice_total THEN 'paid'
            WHEN invoice_paid + NEW.amount > 0 THEN 'partially_paid'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    -- Créer automatiquement une transaction dans la caisse
    INSERT INTO transactions (
        reference, type, category, amount, payment_method,
        patient_id, source, source_reference, user_id, status
    )
    VALUES (
        generate_reference('CAIS'),
        'revenue',
        'payment',
        NEW.amount,
        NEW.payment_method,
        NEW.patient_id,
        'cashier',
        NEW.reference,
        NEW.processed_by,
        'validated'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();

-- Trigger pour créer une transaction automatique lors d'une vente pharmacie
CREATE OR REPLACE FUNCTION create_transaction_on_pharmacy_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer une facture automatiquement
    INSERT INTO invoices (
        reference, patient_id, total, paid_amount, status, created_by
    )
    VALUES (
        generate_reference('FAC'),
        NEW.patient_id,
        NEW.final_amount,
        NEW.final_amount,
        'paid',
        NEW.sold_by
    )
    RETURNING id INTO NEW.invoice_id;
    
    -- Créer un paiement
    INSERT INTO payments (
        reference, invoice_id, patient_id, amount, payment_method, processed_by
    )
    VALUES (
        generate_reference('PAY'),
        NEW.invoice_id,
        NEW.patient_id,
        NEW.final_amount,
        NEW.payment_method,
        NEW.sold_by
    );
    
    -- Créer une transaction dans la caisse
    INSERT INTO transactions (
        reference, type, category, amount, payment_method,
        patient_id, source, source_reference, user_id, status
    )
    VALUES (
        generate_reference('CAIS'),
        'revenue',
        'pharmacy',
        NEW.final_amount,
        NEW.payment_method,
        NEW.patient_id,
        'pharmacy',
        NEW.reference,
        NEW.sold_by,
        'validated'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transaction_on_pharmacy_sale
AFTER INSERT ON pharmacy_sales
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION create_transaction_on_pharmacy_sale();

-- RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Tables du système financier créées avec succès !';
    RAISE NOTICE '   → Transactions, Factures, Paiements, Reçus';
    RAISE NOTICE '   → Dépenses, Remboursements';
    RAISE NOTICE '   → Stock Pharmacie, Ventes, Entrées, Historique';
    RAISE NOTICE '   → Ordonnances, Lignes ordonnance';
    RAISE NOTICE '   → Journal d''audit, Clôtures de caisse';
    RAISE NOTICE '   → Triggers automatiques pour intégration Pharmacie ↔ Caisse';
END $$;
