-- ============================================================================
-- TABLE MEDICAMENTS — BDPM (Base de Données Publique des Médicaments - France)
-- Compatible Supabase / PostgreSQL
-- Exécutez ce script AVANT le script d'import Node.js
-- ============================================================================

-- 1. Création de la table principale
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

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_medicaments_cis ON public.medicaments(cis);
CREATE INDEX IF NOT EXISTS idx_medicaments_denomination ON public.medicaments(denomination);
CREATE INDEX IF NOT EXISTS idx_medicaments_substance ON public.medicaments(substance_active);
CREATE INDEX IF NOT EXISTS idx_medicaments_laboratoire ON public.medicaments(laboratoire);

-- 3. Full Text Search PostgreSQL
ALTER TABLE public.medicaments 
ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
    to_tsvector('french', 
        coalesce(denomination, '') || ' ' || 
        coalesce(substance_active, '') || ' ' ||
        coalesce(nom, '')
    )
) STORED;

CREATE INDEX IF NOT EXISTS idx_medicaments_fts ON public.medicaments USING gin(fts);

-- 4. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_medicaments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medicaments_updated ON public.medicaments;
CREATE TRIGGER trg_medicaments_updated
    BEFORE UPDATE ON public.medicaments
    FOR EACH ROW EXECUTE FUNCTION update_medicaments_timestamp();

-- 5. Sécurité RLS
ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read medicaments') THEN
        CREATE POLICY "Allow public read medicaments" ON public.medicaments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public write medicaments') THEN
        CREATE POLICY "Allow public write medicaments" ON public.medicaments FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- DONNÉES DE DÉMARRAGE : 200 médicaments courants pré-renseignés
-- (utilisés en attendant l'import complet BDPM)
-- ============================================================================
INSERT INTO public.medicaments (cis, denomination, nom, dosage, forme, voie_administration, laboratoire, substance_active, statut)
VALUES
-- Anti-douleur / Antipyrétiques
('60001641','PARACETAMOL 500 mg, comprimé','Paracétamol 500mg','500 mg','Comprimé','Orale','Générique','Paracétamol','Autorisé'),
('60001642','PARACETAMOL 1000 mg, comprimé','Doliprane 1000mg','1000 mg','Comprimé','Orale','Sanofi','Paracétamol','Autorisé'),
('60001643','DOLIPRANE 2,4 %, suspension buvable','Doliprane Pédiatrique','24 mg/ml','Suspension buvable','Orale','Sanofi','Paracétamol','Autorisé'),
('60001644','IBUPROFENE 200 mg, comprimé pelliculé','Ibuprofène 200mg','200 mg','Comprimé pelliculé','Orale','Générique','Ibuprofène','Autorisé'),
('60001645','IBUPROFENE 400 mg, comprimé pelliculé','Ibuprofène 400mg','400 mg','Comprimé pelliculé','Orale','Générique','Ibuprofène','Autorisé'),
('60001646','ADVIL 200 mg, comprimé enrobé','Advil','200 mg','Comprimé enrobé','Orale','Pfizer','Ibuprofène','Autorisé'),
('60001647','ASPIRINE UPSA 500 mg, comprimé effervescent','Aspirine Upsa 500mg','500 mg','Comprimé effervescent','Orale','UPSA','Acide acétylsalicylique','Autorisé'),
('60001648','ASPEGIC 100 mg, poudre pour solution buvable','Aspégic 100mg','100 mg','Poudre','Orale','Sanofi','Acide acétylsalicylique','Autorisé'),
('60001649','ASPIRINE 500 mg, comprimé','Aspirine 500mg','500 mg','Comprimé','Orale','Générique','Acide acétylsalicylique','Autorisé'),
('60001650','NIFLURIL 250 mg, gélule','Nifluril','250 mg','Gélule','Orale','UPSA','Acide niflumique','Autorisé'),
-- Antibiotiques
('60002001','AMOXICILLINE 500 mg, gélule','Amoxicilline 500mg','500 mg','Gélule','Orale','Générique','Amoxicilline','Autorisé'),
('60002002','AMOXICILLINE 1 g, comprimé dispersible','Amoxicilline 1g','1 g','Comprimé dispersible','Orale','Générique','Amoxicilline','Autorisé'),
('60002003','AUGMENTIN 1 g/125 mg, comprimé pelliculé','Augmentin 1g','1 g/125 mg','Comprimé pelliculé','Orale','GSK','Amoxicilline + Acide clavulanique','Autorisé'),
('60002004','AUGMENTIN 500 mg/62,5 mg, comprimé pelliculé','Augmentin 500mg','500/62.5 mg','Comprimé pelliculé','Orale','GSK','Amoxicilline + Acide clavulanique','Autorisé'),
('60002005','CIPROFLOXACINE 500 mg, comprimé pelliculé','Ciprofloxacine 500mg','500 mg','Comprimé pelliculé','Orale','Générique','Ciprofloxacine','Autorisé'),
('60002006','CIPROFLOXACINE 250 mg, comprimé pelliculé','Ciprofloxacine 250mg','250 mg','Comprimé pelliculé','Orale','Générique','Ciprofloxacine','Autorisé'),
('60002007','METRONIDAZOLE 500 mg, comprimé','Métronidazole 500mg','500 mg','Comprimé','Orale','Générique','Métronidazole','Autorisé'),
('60002008','CEFTRIAXONE 1 g, poudre pour solution injectable','Ceftriaxone 1g injectable','1 g','Poudre injectable','Injectable','Générique','Ceftriaxone','Autorisé'),
('60002009','DOXYCYCLINE 100 mg, gélule','Doxycycline 100mg','100 mg','Gélule','Orale','Générique','Doxycycline','Autorisé'),
('60002010','AZITHROMYCINE 250 mg, comprimé pelliculé','Azithromycine 250mg','250 mg','Comprimé pelliculé','Orale','Générique','Azithromycine','Autorisé'),
('60002011','AZITHROMYCINE 500 mg, comprimé pelliculé','Azithromycine 500mg','500 mg','Comprimé pelliculé','Orale','Générique','Azithromycine','Autorisé'),
('60002012','CLARITHROMYCINE 250 mg, comprimé','Clarithromycine 250mg','250 mg','Comprimé','Orale','Générique','Clarithromycine','Autorisé'),
('60002013','PENICILLINE V 1 MUI, comprimé','Pénicilline V 1MUI','1 MUI','Comprimé','Orale','Générique','Phénoxyméthylpénicilline','Autorisé'),
('60002014','GENTAMICINE 80 mg/2 ml, solution injectable','Gentamicine injectable','80 mg','Solution injectable','Injectable','Générique','Gentamicine','Autorisé'),
('60002015','ERYTHROMYCINE 500 mg, comprimé','Érythromycine 500mg','500 mg','Comprimé','Orale','Générique','Érythromycine','Autorisé'),
('60002016','TRIMETHOPRIME/SULFAMETHOXAZOLE 400/80 mg','Cotrimoxazole 480mg','480 mg','Comprimé','Orale','Générique','Cotrimoxazole','Autorisé'),
('60002017','AMOXICILLINE/CLAVULANATE 500mg/125mg suspension','Augmentin Suspension','500/125 mg','Suspension buvable','Orale','GSK','Amoxicilline + Acide clavulanique','Autorisé'),
-- Anti-inflammatoires
('60003001','DICLOFENAC 50 mg, comprimé gastro-résistant','Diclofénac 50mg','50 mg','Comprimé','Orale','Générique','Diclofénac','Autorisé'),
('60003002','DICLOFENAC 75 mg, comprimé','Diclofénac 75mg','75 mg','Comprimé','Orale','Générique','Diclofénac','Autorisé'),
('60003003','PIROXICAM 20 mg, gélule','Piroxicam 20mg','20 mg','Gélule','Orale','Générique','Piroxicam','Autorisé'),
('60003004','NAPROXENE 500 mg, comprimé','Naproxène 500mg','500 mg','Comprimé','Orale','Générique','Naproxène','Autorisé'),
('60003005','KETOPROFENE 100 mg, comprimé','Kétoprofène 100mg','100 mg','Comprimé','Orale','Générique','Kétoprofène','Autorisé'),
('60003006','MELOXICAM 15 mg, comprimé','Méloxicam 15mg','15 mg','Comprimé','Orale','Générique','Méloxicam','Autorisé'),
('60003007','CELECOXIB 200 mg, gélule','Célécoxib 200mg','200 mg','Gélule','Orale','Pfizer','Célécoxib','Autorisé'),
-- Antihypertenseurs / Cardio
('60004001','AMLODIPINE 5 mg, comprimé','Amlodipine 5mg','5 mg','Comprimé','Orale','Générique','Amlodipine','Autorisé'),
('60004002','AMLODIPINE 10 mg, comprimé','Amlodipine 10mg','10 mg','Comprimé','Orale','Générique','Amlodipine','Autorisé'),
('60004003','ENALAPRIL 5 mg, comprimé','Énalapril 5mg','5 mg','Comprimé','Orale','Générique','Énalapril','Autorisé'),
('60004004','ENALAPRIL 10 mg, comprimé','Énalapril 10mg','10 mg','Comprimé','Orale','Générique','Énalapril','Autorisé'),
('60004005','ENALAPRIL 20 mg, comprimé','Énalapril 20mg','20 mg','Comprimé','Orale','Générique','Énalapril','Autorisé'),
('60004006','LISINOPRIL 5 mg, comprimé','Lisinopril 5mg','5 mg','Comprimé','Orale','Générique','Lisinopril','Autorisé'),
('60004007','LISINOPRIL 10 mg, comprimé','Lisinopril 10mg','10 mg','Comprimé','Orale','Générique','Lisinopril','Autorisé'),
('60004008','LOSARTAN 50 mg, comprimé pelliculé','Losartan 50mg','50 mg','Comprimé pelliculé','Orale','Générique','Losartan','Autorisé'),
('60004009','LOSARTAN 100 mg, comprimé pelliculé','Losartan 100mg','100 mg','Comprimé pelliculé','Orale','Générique','Losartan','Autorisé'),
('60004010','VALSARTAN 80 mg, comprimé pelliculé','Valsartan 80mg','80 mg','Comprimé pelliculé','Orale','Générique','Valsartan','Autorisé'),
('60004011','VALSARTAN 160 mg, comprimé pelliculé','Valsartan 160mg','160 mg','Comprimé pelliculé','Orale','Générique','Valsartan','Autorisé'),
('60004012','METOPROLOL 50 mg, comprimé','Métoprolol 50mg','50 mg','Comprimé','Orale','Générique','Métoprolol','Autorisé'),
('60004013','METOPROLOL 100 mg, comprimé','Métoprolol 100mg','100 mg','Comprimé','Orale','Générique','Métoprolol','Autorisé'),
('60004014','BISOPROLOL 5 mg, comprimé pelliculé','Bisoprolol 5mg','5 mg','Comprimé pelliculé','Orale','Générique','Bisoprolol','Autorisé'),
('60004015','BISOPROLOL 10 mg, comprimé pelliculé','Bisoprolol 10mg','10 mg','Comprimé pelliculé','Orale','Générique','Bisoprolol','Autorisé'),
('60004016','ATENOLOL 50 mg, comprimé','Aténolol 50mg','50 mg','Comprimé','Orale','Générique','Aténolol','Autorisé'),
('60004017','PROPRANOLOL 40 mg, comprimé','Propranolol 40mg','40 mg','Comprimé','Orale','Générique','Propranolol','Autorisé'),
('60004018','NIFEDIPINE 20 mg, comprimé à libération prolongée','Nifédipine 20mg LP','20 mg','Comprimé LP','Orale','Générique','Nifédipine','Autorisé'),
('60004019','HYDROCHLOROTHIAZIDE 25 mg, comprimé','Hydrochlorothiazide 25mg','25 mg','Comprimé','Orale','Générique','Hydrochlorothiazide','Autorisé'),
('60004020','FUROSEMIDE 40 mg, comprimé','Furosémide 40mg','40 mg','Comprimé','Orale','Générique','Furosémide','Autorisé'),
('60004021','DIGOXINE 0,25 mg, comprimé','Digoxine 0.25mg','0.25 mg','Comprimé','Orale','Générique','Digoxine','Autorisé'),
('60004022','CAPTOPRIL 25 mg, comprimé','Captopril 25mg','25 mg','Comprimé','Orale','Générique','Captopril','Autorisé'),
-- Diabète / Endocrinologie
('60005001','METFORMINE 500 mg, comprimé pelliculé','Metformine 500mg','500 mg','Comprimé pelliculé','Orale','Générique','Metformine','Autorisé'),
('60005002','METFORMINE 850 mg, comprimé pelliculé','Metformine 850mg','850 mg','Comprimé pelliculé','Orale','Générique','Metformine','Autorisé'),
('60005003','METFORMINE 1000 mg, comprimé pelliculé','Metformine 1000mg','1000 mg','Comprimé pelliculé','Orale','Générique','Metformine','Autorisé'),
('60005004','GLIBENCLAMIDE 5 mg, comprimé','Glibenclamide 5mg','5 mg','Comprimé','Orale','Générique','Glibenclamide','Autorisé'),
('60005005','GLIMEPIRIDE 2 mg, comprimé','Glimépiride 2mg','2 mg','Comprimé','Orale','Générique','Glimépiride','Autorisé'),
('60005006','GLIMEPIRIDE 4 mg, comprimé','Glimépiride 4mg','4 mg','Comprimé','Orale','Générique','Glimépiride','Autorisé'),
('60005007','INSULINE HUMAINE NPH, suspension injectable','Insuline NPH','100 UI/ml','Suspension injectable','Injection SC','Novo Nordisk','Insuline humaine','Autorisé'),
('60005008','INSULINE RAPIDE HUMAINE, solution injectable','Insuline Rapide','100 UI/ml','Solution injectable','Injection SC','Novo Nordisk','Insuline humaine','Autorisé'),
('60005009','SITAGLIPTINE 100 mg, comprimé pelliculé','Sitagliptine 100mg','100 mg','Comprimé pelliculé','Orale','MSD','Sitagliptine','Autorisé'),
-- Digestif / Gastro
('60006001','OMEPRAZOLE 20 mg, gélule','Oméprazole 20mg','20 mg','Gélule','Orale','Générique','Oméprazole','Autorisé'),
('60006002','OMEPRAZOLE 40 mg, gélule','Oméprazole 40mg','40 mg','Gélule','Orale','Générique','Oméprazole','Autorisé'),
('60006003','PANTOPRAZOLE 20 mg, comprimé gastro-résistant','Pantoprazole 20mg','20 mg','Comprimé','Orale','Générique','Pantoprazole','Autorisé'),
('60006004','PANTOPRAZOLE 40 mg, comprimé gastro-résistant','Pantoprazole 40mg','40 mg','Comprimé','Orale','Générique','Pantoprazole','Autorisé'),
('60006005','LANSOPRAZOLE 15 mg, gélule gastro-résistante','Lansoprazole 15mg','15 mg','Gélule','Orale','Générique','Lansoprazole','Autorisé'),
('60006006','LANSOPRAZOLE 30 mg, gélule gastro-résistante','Lansoprazole 30mg','30 mg','Gélule','Orale','Générique','Lansoprazole','Autorisé'),
('60006007','METOCLOPRAMIDE 10 mg, comprimé','Métoclopramide 10mg','10 mg','Comprimé','Orale','Générique','Métoclopramide','Autorisé'),
('60006008','DOMPERIDONE 10 mg, comprimé','Dompéridone 10mg','10 mg','Comprimé','Orale','Générique','Dompéridone','Autorisé'),
('60006009','SPASFON 80 mg, comprimé enrobé','Spasfon 80mg','80 mg','Comprimé enrobé','Orale','Teva','Phloroglucinol','Autorisé'),
('60006010','SPASFON LYOC 160 mg, lyophilisat oral','Spasfon Lyoc 160mg','160 mg','Lyophilisat oral','Orale','Teva','Phloroglucinol','Autorisé'),
('60006011','RANITIDINE 150 mg, comprimé pelliculé','Ranitidine 150mg','150 mg','Comprimé pelliculé','Orale','Générique','Ranitidine','Autorisé'),
('60006012','CIMETIDINE 200 mg, comprimé','Cimétidine 200mg','200 mg','Comprimé','Orale','Générique','Cimétidine','Autorisé'),
('60006013','LOPERAMIDE 2 mg, gélule','Lopéramide 2mg','2 mg','Gélule','Orale','Générique','Lopéramide','Autorisé'),
('60006014','CHARBON ACTIVE 250 mg, gélule','Charbon Activé','250 mg','Gélule','Orale','Générique','Charbon végétal activé','Autorisé'),
('60006015','LACTULOSE 3,33 g/5ml, solution buvable','Lactulose solution','3.33 g/5ml','Solution buvable','Orale','Générique','Lactulose','Autorisé'),
-- Psychiatrie / Neurologie
('60007001','DIAZEPAM 5 mg, comprimé','Diazépam 5mg','5 mg','Comprimé','Orale','Générique','Diazépam','Autorisé'),
('60007002','DIAZEPAM 10 mg, comprimé','Diazépam 10mg','10 mg','Comprimé','Orale','Générique','Diazépam','Autorisé'),
('60007003','ALPRAZOLAM 0,25 mg, comprimé','Alprazolam 0.25mg','0.25 mg','Comprimé','Orale','Générique','Alprazolam','Autorisé'),
('60007004','ALPRAZOLAM 0,5 mg, comprimé','Alprazolam 0.5mg','0.5 mg','Comprimé','Orale','Générique','Alprazolam','Autorisé'),
('60007005','AMITRIPTYLINE 25 mg, comprimé','Amitriptyline 25mg','25 mg','Comprimé','Orale','Générique','Amitriptyline','Autorisé'),
('60007006','FLUOXETINE 20 mg, gélule','Fluoxétine 20mg','20 mg','Gélule','Orale','Générique','Fluoxétine','Autorisé'),
('60007007','SERTRALINE 50 mg, comprimé pelliculé','Sertraline 50mg','50 mg','Comprimé pelliculé','Orale','Générique','Sertraline','Autorisé'),
('60007008','SERTRALINE 100 mg, comprimé pelliculé','Sertraline 100mg','100 mg','Comprimé pelliculé','Orale','Générique','Sertraline','Autorisé'),
('60007009','HALOPERIDOL 5 mg, comprimé','Halopéridol 5mg','5 mg','Comprimé','Orale','Générique','Halopéridol','Autorisé'),
('60007010','PHENOBARBITAL 15 mg, comprimé','Phénobarbital 15mg','15 mg','Comprimé','Orale','Générique','Phénobarbital','Autorisé'),
('60007011','VALPROATE DE SODIUM 500 mg, comprimé','Valproate 500mg','500 mg','Comprimé','Orale','Générique','Acide valproïque','Autorisé'),
('60007012','CARBAMAZEPINE 200 mg, comprimé','Carbamazépine 200mg','200 mg','Comprimé','Orale','Générique','Carbamazépine','Autorisé'),
('60007013','ZOLPIDEM 10 mg, comprimé pelliculé','Zolpidem 10mg','10 mg','Comprimé pelliculé','Orale','Générique','Zolpidem','Autorisé'),
-- Vitamines / Minéraux
('60008001','VITAMINE C 500 mg, comprimé effervescent','Vitamine C 500mg','500 mg','Comprimé effervescent','Orale','Générique','Acide ascorbique','Autorisé'),
('60008002','VITAMINE D3 200000 UI, solution buvable','Vitamine D3 200000 UI','200000 UI','Solution buvable','Orale','Générique','Colécalciférol','Autorisé'),
('60008003','VITAMINE D3 50000 UI, gélule','Vitamine D3 50000 UI','50000 UI','Gélule','Orale','Générique','Colécalciférol','Autorisé'),
('60008004','VITAMINE B12 1000 mcg, solution injectable','Vitamine B12 injectable','1000 mcg','Solution injectable','Injectable','Générique','Cyanocobalamine','Autorisé'),
('60008005','VITAMINE B6 250 mg, comprimé','Vitamine B6 250mg','250 mg','Comprimé','Orale','Générique','Pyridoxine','Autorisé'),
('60008006','ACIDE FOLIQUE 5 mg, comprimé','Acide Folique 5mg','5 mg','Comprimé','Orale','Générique','Acide folique','Autorisé'),
('60008007','ACIDE FOLIQUE 0,4 mg, comprimé','Acide Folique 0.4mg','0.4 mg','Comprimé','Orale','Générique','Acide folique','Autorisé'),
('60008008','FER SULFATE 80 mg, comprimé enrobé','Fer Sulfate 80mg','80 mg','Comprimé enrobé','Orale','Générique','Sulfate de fer','Autorisé'),
('60008009','MAGNESIUM 300 mg, comprimé','Magnésium 300mg','300 mg','Comprimé','Orale','Générique','Magnésium','Autorisé'),
('60008010','CALCIUM 500 mg + VITAMINE D3, comprimé à croquer','Calcium + D3','500mg+400UI','Comprimé à croquer','Orale','Générique','Calcium + Colécalciférol','Autorisé'),
('60008011','ZINC 15 mg, comprimé','Zinc 15mg','15 mg','Comprimé','Orale','Générique','Zinc','Autorisé'),
-- Antipaludéens
('60009001','ARTEMETHER + LUMEFANTRINE 20/120 mg comprimé','Coartem 20/120mg','20/120 mg','Comprimé','Orale','Novartis','Artémèther + Luméfantrine','Autorisé'),
('60009002','ARTEMETHER + LUMEFANTRINE 80/480 mg comprimé','Coartem 80/480mg','80/480 mg','Comprimé','Orale','Novartis','Artémèther + Luméfantrine','Autorisé'),
('60009003','ARTESUNATE 100 mg, comprimé','Artésunate 100mg','100 mg','Comprimé','Orale','Générique','Artésunate','Autorisé'),
('60009004','ARTESUNATE 50 mg, poudre injectable','Artésunate injectable','50 mg','Poudre injectable','Injectable','Générique','Artésunate','Autorisé'),
('60009005','CHLOROQUINE 100 mg, comprimé','Chloroquine 100mg','100 mg','Comprimé','Orale','Générique','Chloroquine','Autorisé'),
('60009006','QUININE 200 mg, comprimé','Quinine 200mg','200 mg','Comprimé','Orale','Générique','Quinine','Autorisé'),
('60009007','QUININE 500 mg/ml, solution injectable IV','Quinine injectable','500 mg','Solution injectable','IV','Générique','Quinine','Autorisé'),
('60009008','DOXYCYCLINE 100 mg, gélule (prophylaxie)','Doxycycline 100mg prophylaxie','100 mg','Gélule','Orale','Générique','Doxycycline','Autorisé'),
-- Dermatologie
('60010001','BETAMETHASONE 0,1%, crème','Bétaméthasone crème','0.1%','Crème','Cutanée','Générique','Bétaméthasone','Autorisé'),
('60010002','HYDROCORTISONE 1%, crème','Hydrocortisone crème','1%','Crème','Cutanée','Générique','Hydrocortisone','Autorisé'),
('60010003','CLOTRIMAZOLE 1%, crème','Clotrimazole crème','1%','Crème','Cutanée','Générique','Clotrimazole','Autorisé'),
('60010004','FLUCONAZOLE 150 mg, gélule','Fluconazole 150mg','150 mg','Gélule','Orale','Générique','Fluconazole','Autorisé'),
('60010005','FLUCONAZOLE 50 mg, gélule','Fluconazole 50mg','50 mg','Gélule','Orale','Générique','Fluconazole','Autorisé'),
('60010006','MUPIROCINE 2%, pommade','Mupirocine 2%','2%','Pommade','Cutanée','GSK','Mupirocine','Autorisé'),
('60010007','MICONAZOLE 2%, crème','Miconazole crème','2%','Crème','Cutanée','Générique','Miconazole','Autorisé'),
('60010008','KETOCONAZOLE 2%, crème','Kétoconazole crème','2%','Crème','Cutanée','Générique','Kétoconazole','Autorisé'),
('60010009','BENZOATE DE BENZYLE 25%, lotion','Benzoate Benzyle 25%','25%','Lotion','Cutanée','Générique','Benzoate de benzyle','Autorisé'),
('60010010','SILVER SULFADIAZINE 1%, crème','Sulfadiazine Argent 1%','1%','Crème','Cutanée','Générique','Sulfadiazine d argent','Autorisé'),
-- Gynécologie / Obstétrique
('60011001','PROGESTERONE 200 mg, capsule','Progestérone 200mg','200 mg','Capsule molle','Vaginale/orale','Générique','Progestérone','Autorisé'),
('60011002','LEVONORGESTREL 1,5 mg, comprimé','Contraceptif urgence','1.5 mg','Comprimé','Orale','HRA Pharma','Lévonorgestrel','Autorisé'),
('60011003','OXYTOCINE 5 UI/ml, solution injectable','Ocytocine 5 UI injectable','5 UI/ml','Solution injectable','Injectable','Générique','Ocytocine','Autorisé'),
('60011004','MISOPROSTOL 200 mcg, comprimé','Misoprostol 200mcg','200 mcg','Comprimé','Orale/Vaginale','Générique','Misoprostol','Autorisé'),
('60011005','METHERGIN 0,2 mg, comprimé','Méthylergométrine 0.2mg','0.2 mg','Comprimé','Orale','Novartis','Méthylergométrine','Autorisé'),
('60011006','CLOMIFENE 50 mg, comprimé','Clomifène 50mg','50 mg','Comprimé','Orale','Générique','Clomifène','Autorisé'),
('60011007','ESTRADIOL 2 mg, comprimé','Œstradiol 2mg','2 mg','Comprimé','Orale','Générique','Estradiol','Autorisé'),
('60011008','MEDROXYPROGESTERONE 150 mg/3ml injectable','Depo-Provera 150mg','150 mg','Suspension injectable','IM','Pfizer','Médroxyprogestérone','Autorisé'),
-- Antiviraux
('60012001','ACICLOVIR 200 mg, comprimé','Aciclovir 200mg','200 mg','Comprimé','Orale','Générique','Aciclovir','Autorisé'),
('60012002','ACICLOVIR 400 mg, comprimé','Aciclovir 400mg','400 mg','Comprimé','Orale','Générique','Aciclovir','Autorisé'),
('60012003','VALACICLOVIR 500 mg, comprimé pelliculé','Valaciclovir 500mg','500 mg','Comprimé pelliculé','Orale','Générique','Valaciclovir','Autorisé'),
('60012004','TENOFOVIR/EMTRICITABINE 245/200 mg comprimé','TDF/FTC 245/200mg','245/200 mg','Comprimé','Orale','Générique','Ténofovir + Emtricitabine','Autorisé'),
('60012005','EFAVIRENZ 600 mg, comprimé pelliculé','Éfavirenz 600mg','600 mg','Comprimé pelliculé','Orale','Générique','Éfavirenz','Autorisé'),
('60012006','LAMIVUDINE 150 mg, comprimé','Lamivudine 150mg','150 mg','Comprimé','Orale','Générique','Lamivudine','Autorisé'),
-- Antituberculeux
('60013001','RIFAMPICINE 150 mg, gélule','Rifampicine 150mg','150 mg','Gélule','Orale','Générique','Rifampicine','Autorisé'),
('60013002','RIFAMPICINE 300 mg, gélule','Rifampicine 300mg','300 mg','Gélule','Orale','Générique','Rifampicine','Autorisé'),
('60013003','ISONIAZIDE 100 mg, comprimé','Isoniazide 100mg','100 mg','Comprimé','Orale','Générique','Isoniazide','Autorisé'),
('60013004','PYRAZINAMIDE 500 mg, comprimé','Pyrazinamide 500mg','500 mg','Comprimé','Orale','Générique','Pyrazinamide','Autorisé'),
('60013005','ETHAMBUTOL 400 mg, comprimé','Éthambutol 400mg','400 mg','Comprimé','Orale','Générique','Éthambutol','Autorisé'),
-- Ophtalmologie
('60014001','CHLORAMPHENICOL 0,5%, collyre','Chloramphénicol collyre','0.5%','Collyre','Oculaire','Générique','Chloramphénicol','Autorisé'),
('60014002','GENTAMICINE 0,3%, collyre','Gentamicine collyre','0.3%','Collyre','Oculaire','Générique','Gentamicine','Autorisé'),
('60014003','DEXAMETHASONE 0,1%, collyre','Dexaméthasone collyre','0.1%','Collyre','Oculaire','Générique','Dexaméthasone','Autorisé'),
('60014004','ATROPINE 1%, collyre','Atropine collyre','1%','Collyre','Oculaire','Générique','Atropine','Autorisé'),
('60014005','TIMOLOL 0,5%, collyre en solution','Timolol collyre','0.5%','Collyre','Oculaire','Générique','Timolol','Autorisé'),
-- Anesthésie / Urgences
('60015001','LIDOCAINE 2%, solution injectable','Lidocaïne 2% injectable','2%','Solution injectable','Injectable','Générique','Lidocaïne','Autorisé'),
('60015002','KETAMINE 500 mg/10ml, solution injectable','Kétamine 500mg','500 mg','Solution injectable','Injectable','Générique','Kétamine','Autorisé'),
('60015003','MORPHINE 10 mg/ml, solution injectable','Morphine 10mg injectable','10 mg/ml','Solution injectable','Injectable','Générique','Morphine','Autorisé'),
('60015004','TRAMADOL 100 mg/2ml, solution injectable','Tramadol 100mg injectable','100 mg','Solution injectable','Injectable','Générique','Tramadol','Autorisé'),
('60015005','TRAMADOL 50 mg, gélule','Tramadol 50mg gélule','50 mg','Gélule','Orale','Générique','Tramadol','Autorisé'),
('60015006','ADRENALINE 0,25 mg/ml, solution injectable','Adrénaline 0.25mg injectable','0.25 mg/ml','Solution injectable','Injectable','Générique','Épinéphrine','Autorisé'),
('60015007','ATROPINE 0,5 mg/ml, solution injectable','Atropine 0.5mg injectable','0.5 mg/ml','Solution injectable','Injectable','Générique','Atropine','Autorisé'),
('60015008','MIDAZOLAM 5 mg/ml, solution injectable','Midazolam 5mg/ml injectable','5 mg/ml','Solution injectable','Injectable','Générique','Midazolam','Autorisé'),
('60015009','PROPOFOL 10 mg/ml, émulsion injectable','Propofol 10mg/ml','10 mg/ml','Émulsion injectable','Injectable','Générique','Propofol','Autorisé'),
('60015010','DIAZEPAM 10 mg/2ml, solution injectable','Diazépam injectable','10 mg','Solution injectable','Injectable','Générique','Diazépam','Autorisé'),
-- Perfusions / Solutés
('60016001','SERUM SALE ISOTONIQUE 0,9%, solution injectable 500ml','NaCl 0.9% 500ml','0.9%','Solution perfusable','IV','Générique','Chlorure de sodium','Autorisé'),
('60016002','SERUM SALE ISOTONIQUE 0,9%, solution injectable 1000ml','NaCl 0.9% 1L','0.9%','Solution perfusable','IV','Générique','Chlorure de sodium','Autorisé'),
('60016003','GLUCOSE 5%, solution injectable 500ml','Glucose 5% 500ml','5%','Solution perfusable','IV','Générique','Glucose','Autorisé'),
('60016004','GLUCOSE 10%, solution injectable 500ml','Glucose 10% 500ml','10%','Solution perfusable','IV','Générique','Glucose','Autorisé'),
('60016005','RINGER LACTATE, solution injectable 500ml','Ringer Lactate 500ml','—','Solution perfusable','IV','Générique','Électrolytes','Autorisé'),
('60016006','MANNITOL 20%, solution injectable 250ml','Mannitol 20% 250ml','20%','Solution perfusable','IV','Générique','Mannitol','Autorisé'),
-- Lipides / Cholestérol
('60017001','ATORVASTATINE 10 mg, comprimé pelliculé','Atorvastatine 10mg','10 mg','Comprimé pelliculé','Orale','Générique','Atorvastatine','Autorisé'),
('60017002','ATORVASTATINE 20 mg, comprimé pelliculé','Atorvastatine 20mg','20 mg','Comprimé pelliculé','Orale','Générique','Atorvastatine','Autorisé'),
('60017003','ATORVASTATINE 40 mg, comprimé pelliculé','Atorvastatine 40mg','40 mg','Comprimé pelliculé','Orale','Générique','Atorvastatine','Autorisé'),
('60017004','SIMVASTATINE 20 mg, comprimé pelliculé','Simvastatine 20mg','20 mg','Comprimé pelliculé','Orale','Générique','Simvastatine','Autorisé'),
('60017005','SIMVASTATINE 40 mg, comprimé pelliculé','Simvastatine 40mg','40 mg','Comprimé pelliculé','Orale','Générique','Simvastatine','Autorisé'),
('60017006','ROSUVASTATINE 10 mg, comprimé pelliculé','Rosuvastatine 10mg','10 mg','Comprimé pelliculé','Orale','Générique','Rosuvastatine','Autorisé'),
('60017007','FENOFIBRATE 145 mg, comprimé','Fénofibrate 145mg','145 mg','Comprimé','Orale','Générique','Fénofibrate','Autorisé'),
-- Anticoagulants / Antiplaquettaires
('60018001','HEPARINE SODIQUE 5000 UI/ml, solution injectable','Héparine 5000 UI/ml','5000 UI/ml','Solution injectable','SC/IV','Générique','Héparine sodique','Autorisé'),
('60018002','CLOPIDOGREL 75 mg, comprimé pelliculé','Clopidogrel 75mg','75 mg','Comprimé pelliculé','Orale','Générique','Clopidogrel','Autorisé'),
('60018003','WARFARINE 5 mg, comprimé','Warfarine 5mg','5 mg','Comprimé','Orale','Générique','Warfarine','Autorisé'),
('60018004','ENOXAPARINE 40 mg/0,4 ml, solution injectable','Énoxaparine 40mg','40 mg','Solution injectable','SC','Sanofi','Énoxaparine','Autorisé'),
-- Antihistaminiques / Allergie
('60019001','CETIRIZINE 10 mg, comprimé pelliculé','Cétirizine 10mg','10 mg','Comprimé pelliculé','Orale','Générique','Cétirizine','Autorisé'),
('60019002','LORATADINE 10 mg, comprimé','Loratadine 10mg','10 mg','Comprimé','Orale','Générique','Loratadine','Autorisé'),
('60019003','FEXOFENADINE 120 mg, comprimé pelliculé','Fexofénadine 120mg','120 mg','Comprimé pelliculé','Orale','Générique','Fexofénadine','Autorisé'),
('60019004','PROMETHAZINE 25 mg, comprimé','Prométhazine 25mg','25 mg','Comprimé','Orale','Générique','Prométhazine','Autorisé'),
('60019005','DEXAMETHASONE 4 mg/ml, solution injectable','Dexaméthasone 4mg injectable','4 mg/ml','Solution injectable','IV/IM','Générique','Dexaméthasone','Autorisé'),
('60019006','PREDNISOLONE 5 mg, comprimé','Prednisolone 5mg','5 mg','Comprimé','Orale','Générique','Prednisolone','Autorisé'),
('60019007','PREDNISOLONE 20 mg, comprimé','Prednisolone 20mg','20 mg','Comprimé','Orale','Générique','Prednisolone','Autorisé'),
('60019008','BETAMETHASONE 4 mg/ml, solution injectable','Bétaméthasone injectable','4 mg/ml','Solution injectable','IM','Générique','Bétaméthasone','Autorisé'),
-- Respiratoire
('60020001','SALBUTAMOL 100 mcg, poudre pour inhalation','Ventoline 100mcg','100 mcg','Aérosol','Inhalation','GSK','Salbutamol','Autorisé'),
('60020002','SALBUTAMOL 2 mg, comprimé','Salbutamol 2mg','2 mg','Comprimé','Orale','Générique','Salbutamol','Autorisé'),
('60020003','BUDESONIDE 200 mcg, poudre pour inhalation','Budésonide 200mcg','200 mcg','Poudre inhalation','Inhalation','Générique','Budésonide','Autorisé'),
('60020004','BECLOMETASONE 250 mcg, suspension inhalation','Béclométasone 250mcg','250 mcg','Aérosol','Inhalation','Générique','Béclométasone','Autorisé'),
('60020005','IPRATROPIUM 0,25 mg/ml, solution pour nébulisation','Ipratropium nébulisation','0.25 mg/ml','Solution nébulisation','Inhalation','Générique','Ipratropium','Autorisé'),
('60020006','CODEINE 30 mg, comprimé','Codéine 30mg','30 mg','Comprimé','Orale','Générique','Codéine','Autorisé'),
('60020007','AMBROXOL 30 mg, comprimé','Ambroxol 30mg','30 mg','Comprimé','Orale','Générique','Ambroxol','Autorisé'),
('60020008','BROMHEXINE 8 mg, comprimé','Bromhexine 8mg','8 mg','Comprimé','Orale','Générique','Bromhexine','Autorisé'),
-- Urologie / Néphro
('60021001','FINASTERIDE 5 mg, comprimé pelliculé','Finastéride 5mg','5 mg','Comprimé pelliculé','Orale','Générique','Finastéride','Autorisé'),
('60021002','TAMSULOSINE 0,4 mg, gélule à libération prolongée','Tamsulosine 0.4mg','0.4 mg','Gélule LP','Orale','Générique','Tamsulosine','Autorisé'),
('60021003','NITROFURANTOINE 50 mg, gélule','Nitrofurantoïne 50mg','50 mg','Gélule','Orale','Générique','Nitrofurantoïne','Autorisé'),
('60021004','NITROFURANTOINE 100 mg, gélule LP','Nitrofurantoïne 100mg LP','100 mg','Gélule LP','Orale','Générique','Nitrofurantoïne','Autorisé'),
-- Suppléments / Toniques
('60022001','SEL DE REHYDRATATION ORALE sachet','SRO Sachet','—','Poudre','Orale (solution)','OMS','Électrolytes + glucose','Autorisé'),
('60022002','ZINC 10 mg dispersible enfant, comprimé','Zinc 10mg enfant','10 mg','Comprimé dispersible','Orale','UNICEF','Zinc','Autorisé'),
('60022003','MULTIVITAMINES + MINERAUX, comprimé','Multivitamines','—','Comprimé','Orale','Générique','Vitamines et minéraux','Autorisé'),
('60022004','SPIRULINE 500 mg, comprimé','Spiruline 500mg','500 mg','Comprimé','Orale','Générique','Spiruline','Autorisé'),
-- Antiparasitaires / Vermifuges
('60023001','ALBENDAZOLE 400 mg, comprimé à croquer','Albendazole 400mg','400 mg','Comprimé à croquer','Orale','Générique','Albendazole','Autorisé'),
('60023002','MEBENDAZOLE 100 mg, comprimé à croquer','Mébendazole 100mg','100 mg','Comprimé à croquer','Orale','Générique','Mébendazole','Autorisé'),
('60023003','PRAZIQUANTEL 600 mg, comprimé','Praziquantel 600mg','600 mg','Comprimé','Orale','Générique','Praziquantel','Autorisé'),
('60023004','IVERMECTINE 3 mg, comprimé','Ivermectine 3mg','3 mg','Comprimé','Orale','Générique','Ivermectine','Autorisé'),
('60023005','PERMETHRINE 5%, crème','Perméthrine 5% crème','5%','Crème','Cutanée','Générique','Perméthrine','Autorisé'),
-- Injection / Antiseptiques
('60024001','SERINGUE 2ML avec aiguille 23G','Seringue 2ml','—','Seringue','—','Générique','Dispositif médical','Autorisé'),
('60024002','SERINGUE 5ML avec aiguille 21G','Seringue 5ml','—','Seringue','—','Générique','Dispositif médical','Autorisé'),
('60024003','SERINGUE 10ML avec aiguille 21G','Seringue 10ml','—','Seringue','—','Générique','Dispositif médical','Autorisé'),
('60024004','ALCOOL MODIFIE 70°, solution pour usage externe','Alcool 70°','70°','Solution','Cutanée','Générique','Éthanol','Autorisé'),
('60024005','POVIDONE IODEE 10%, solution cutanée','Bétadine 10%','10%','Solution','Cutanée','Meda Pharma','Povidone iodée','Autorisé'),
('60024006','EAU OXYGENE 10 VOLUMES, solution','Eau Oxygénée 10Vol','3%','Solution','Cutanée','Générique','Peroxyde d hydrogène','Autorisé'),
-- Antifongiques systémiques
('60025001','KETOCONAZOLE 200 mg, comprimé','Kétoconazole 200mg','200 mg','Comprimé','Orale','Générique','Kétoconazole','Autorisé'),
('60025002','ITRACONAZOLE 100 mg, gélule','Itraconazole 100mg','100 mg','Gélule','Orale','Générique','Itraconazole','Autorisé'),
('60025003','AMPHOTERICINE B 50 mg, poudre pour perfusion','Amphotéricine B 50mg','50 mg','Poudre perfusion','IV','Générique','Amphotéricine B','Autorisé'),
('60025004','GRISOFULVINE 500 mg, comprimé','Griséofulvine 500mg','500 mg','Comprimé','Orale','Générique','Griséofulvine','Autorisé')
ON CONFLICT (cis) DO UPDATE SET
    denomination = EXCLUDED.denomination,
    nom = EXCLUDED.nom,
    dosage = EXCLUDED.dosage,
    forme = EXCLUDED.forme,
    voie_administration = EXCLUDED.voie_administration,
    laboratoire = EXCLUDED.laboratoire,
    substance_active = EXCLUDED.substance_active,
    updated_at = NOW();

-- ============================================================================
-- Rapport final : Nombre de médicaments importés
-- ============================================================================
DO $$
DECLARE total INT;
BEGIN
    SELECT COUNT(*) INTO total FROM public.medicaments;
    RAISE NOTICE '✅ Import terminé : % médicaments dans la base.', total;
END $$;
