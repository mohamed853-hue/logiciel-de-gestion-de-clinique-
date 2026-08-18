-- ============================================================================
-- MODULE DE GESTION DES PATHOLOGIES & DIAGNOSTICS MÉDICAUX (Al Shifa)
-- Exécutez ce script dans l'éditeur SQL de Supabase (Dashboard -> SQL Editor)
-- Toutes les instructions sont idempotentes (IF NOT EXISTS)
-- ============================================================================

-- 1. CATALOGUE DES PATHOLOGIES / MALADIES
CREATE TABLE IF NOT EXISTS public.pathologies_catalog (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL DEFAULT 'Général',
    description TEXT,
    is_custom   BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENREGISTREMENT DES DIAGNOSTICS PATIENTS (Fait par le médecin)
CREATE TABLE IF NOT EXISTS public.patient_diagnostics (
    id                  TEXT PRIMARY KEY,
    patient_id          TEXT NOT NULL,
    patient_name        TEXT,
    patient_file_number TEXT,
    doctor_id           TEXT,
    doctor_name         TEXT NOT NULL,
    disease_name        TEXT NOT NULL,
    category            TEXT DEFAULT 'Général',
    severity            TEXT NOT NULL DEFAULT 'simple'
                        CHECK (severity IN ('simple', 'modere', 'grave', 'critique')),
    evolution_status    TEXT NOT NULL DEFAULT 'en_traitement'
                        CHECK (evolution_status IN ('en_traitement', 'gueri', 'en_observation', 'transfere', 'chronique')),
    notes               TEXT,
    treatment_prescribed TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les statistiques & requêtes du Super Admin et Médecin
CREATE INDEX IF NOT EXISTS idx_diagnostics_patient ON public.patient_diagnostics(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_disease ON public.patient_diagnostics(disease_name);
CREATE INDEX IF NOT EXISTS idx_diagnostics_severity ON public.patient_diagnostics(severity);
CREATE INDEX IF NOT EXISTS idx_diagnostics_evolution ON public.patient_diagnostics(evolution_status);
CREATE INDEX IF NOT EXISTS idx_diagnostics_date ON public.patient_diagnostics(created_at);

-- 3. INSERTION DU CATALOGUE DE BASE DES MALADIES COURANTES
INSERT INTO public.pathologies_catalog (id, name, category, description, is_custom)
VALUES
    ('PATH-001', 'Paludisme (Malaria)', 'Parasitaire & Infectieux', 'Infection parasitaire transmise par l’anophèle', false),
    ('PATH-002', 'Paludisme Grave / Neuropaludisme', 'Urgences & Infectieux', 'Forme sévère nécessitant hospitalisation et surveillance vitale', false),
    ('PATH-003', 'Rhume / Rhinopharyngite', 'Respiratoire & ORL', 'Infection virale bénigne des voies aériennes supérieures', false),
    ('PATH-004', 'Grippe Saisonnière (Influenza)', 'Respiratoire & ORL', 'Infection respiratoire fébrile avec myalgies et céphalées', false),
    ('PATH-005', 'Fièvre Typhoïde', 'Infectieux & Digestif', 'Infection à Salmonella typhi transmise par l’eau/aliments', false),
    ('PATH-006', 'Gastro-entérite Aiguë / Diarrhée', 'Digestif & Urgences', 'Inflammation gastro-intestinale avec déshydratation possible', false),
    ('PATH-007', 'Infection Urinaire / Cystite', 'Urologie & Néphrologie', 'Infection bactérienne des voies urinaires', false),
    ('PATH-008', 'Hypertension Artérielle (HTA)', 'Cardio-vasculaire & Chronique', 'Élévation persistante de la pression artérielle', false),
    ('PATH-009', 'Diabète Type 2', 'Endocrinologie & Chronique', 'Trouble métabolique caractérisé par une hyperglycémie chronique', false),
    ('PATH-010', 'Bronchite Aiguë / Pneumonie', 'Pneumologie & Respiratoire', 'Infection des bronches ou du parenchyme pulmonaire', false),
    ('PATH-011', 'Anémie Sévère / Carence Martiale', 'Hématologie', 'Diminution du taux d’hémoglobine et globules rouges', false),
    ('PATH-012', 'Asthme / Crise d’Asthme', 'Pneumologie & Urgences', 'Affection inflammatoire bronchique avec dyspnée et sifflements', false),
    ('PATH-013', 'Amibiase Intestinale', 'Parasitaire & Digestif', 'Infection parasitaire colique à Entamoeba histolytica', false),
    ('PATH-014', 'Dermatose / Infection Cutanée', 'Dermatologie', 'Infection ou allergie de la peau et des muqueuses', false),
    ('PATH-015', 'Otite Moyenne Aiguë', 'ORL & Pédiatrie', 'Inflammation infectieuse de l’oreille moyenne', false)
ON CONFLICT (name) DO NOTHING;

-- 4. POLITIQUES RLS (Accès sécurisé pour l'application)
ALTER TABLE public.pathologies_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture catalogue pathologies ouverte"
    ON public.pathologies_catalog FOR SELECT USING (true);

CREATE POLICY "Écriture catalogue pathologies ouverte"
    ON public.pathologies_catalog FOR ALL USING (true);

CREATE POLICY "Lecture diagnostics ouverte"
    ON public.patient_diagnostics FOR SELECT USING (true);

CREATE POLICY "Écriture diagnostics ouverte"
    ON public.patient_diagnostics FOR ALL USING (true);
