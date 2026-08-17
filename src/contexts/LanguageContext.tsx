import React, { createContext, useState, useEffect } from 'react';

export type Language = 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isArabic: boolean;
  t: (key: string, fallback?: string) => string;
}

const DICTIONARY: Record<Language, Record<string, string>> = {
  fr: {
    // Header & Global
    'app.title': 'Al Shifa',
    'app.subtitle': 'Clinique Médicale',
    'welcome': 'Bienvenue',
    'logout': 'Déconnexion',
    'settings': 'Paramètres',
    'notifications': 'Notifications',
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'confirm': 'Confirmer',
    'delete': 'Supprimer',
    'print': 'Imprimer',
    'download': 'Télécharger',
    'close': 'Fermer',
    'search': 'Rechercher...',
    'actions': 'Actions',
    'date': 'Date',
    'status': 'Statut',
    'total': 'Total',
    'paid': 'Payé',
    'unpaid': 'Non Payé',
    'pending': 'En attente',
    'currency': 'FCFA',

    // Navigation Tabs
    'nav.overview': 'Tableau de Bord',
    'nav.patients': 'Patients',
    'nav.appointments': 'Rendez-vous',
    'nav.prescriptions': 'Ordonnances',
    'nav.pharmacy': 'Pharmacie & Stock',
    'nav.cashier': 'Caisse & Factures',
    'nav.history': 'Historique',
    'nav.stats': 'Statistiques',

    // Buttons
    'btn.new_patient': '+ Nouveau Patient',
    'btn.schedule_appointment': 'Planifier RDV',
    'btn.view_file': 'Dossier',
    'btn.pay_now': 'Encaisser & Imprimer Reçu',
    'btn.save_invoice': 'Enregistrer la Facture',
    'btn.add_medicine': '+ Nouveau Médicament',
    'btn.empty_cart': 'Vider le panier',
    'btn.validate_sale': 'Valider la Vente',

    // Patient & Medical
    'patient.name': 'Nom & Prénom',
    'patient.file_number': 'N° Dossier',
    'patient.phone': 'Téléphone',
    'patient.age': 'Âge',
    'patient.sex': 'Sexe',
    'patient.blood': 'Groupe Sanguin',
    'patient.allergies': 'Allergies',
    'patient.reason': 'Motif de Venue',
    'patient.arrival_status': 'État Clinique',
    'patient.pregnant': 'Patiente Enceinte',
    'patient.accompanied': 'Accompagné(e)',

    // Cashier & Billing
    'cashier.title': 'Caisse & Facturation Hospitalière',
    'cashier.consultation': 'Consultation Médicale',
    'cashier.hospitalization': 'Séjour & Chambre',
    'cashier.nursing_care': 'Soins & Injections',
    'cashier.pharmacy': 'Médicaments & Pharmacie',
    'cashier.subtotal': 'Sous-total',
    'cashier.discount': 'Remise',
    'cashier.net_total': 'Net à Payer',
    'cashier.payment_method': 'Mode de Paiement',
    'cashier.cash': 'Espèces',
    'cashier.card': 'Carte Bancaire',
    'cashier.transfer': 'Virement',
    'cashier.cash_received': 'Montant Reçu',
    'cashier.change_due': 'Monnaie à Rendre',
    'cashier.authorized_receipt': 'Reçu Officiel - Autorisation de Soins Validée',

    // Pharmacy
    'pharmacy.scanner': 'Scanner Code-Barres',
    'pharmacy.stock': 'Stock Médicaments',
    'pharmacy.sales': 'Ventes Comptoir',
    'pharmacy.arrival_date': 'Date d\'Arrivée / Entrée',
    'pharmacy.expiration_date': 'Date d\'Expiration / Péremption',
    'pharmacy.supplier': 'Fournisseur / Livré par',
    'pharmacy.supplier_phone': 'Téléphone Livreur',
    'pharmacy.purchase_price': 'Prix d\'Achat (FCFA)',
    'pharmacy.sale_price': 'Prix de Vente (FCFA)',
    'pharmacy.tab.quick_sale': '🛒 Comptoir de Vente',
    'pharmacy.tab.caisse': '💰 Caisse Pharmacie',
    'pharmacy.tab.stock': '📦 Gestion du Stock',
    'pharmacy.tab.stock_entries': '🚚 Entrées & Livraisons',
    'pharmacy.tab.alerts': '⚠️ Alertes & Péremptions',
    'pharmacy.tab.history': '📜 Historique Ventes',

    // Cashier Subtabs
    'cashier.tab.billing': 'Facturation Soins & Hospitalisation',
    'cashier.tab.journal': 'Journal des Encaissements',
    'cashier.tab.dashboard': 'Bilan de Caisse & Recettes',
    'cashier.tab.pharmacy_sales': 'Ventes Pharmacie',

    // Patient Profile & Dossier
    'profile.print_dossier': 'Imprimer Dossier Médical',
    'profile.unpaid_bills_detected': 'Facture(s) de soins en attente',
    'profile.pay_at_cashier': 'Régler à la Caisse',
    'profile.tab.identity': 'Identité & Infos',
    'profile.tab.care_bills': 'Soins & Factures',
    'profile.tab.vitals': 'Constantes Vitales',
    'profile.tab.appointments': 'Rendez-vous',
    'profile.tab.prescriptions': 'Ordonnances',
    'profile.tab.labs': 'Analyses Médicales',

    // History & Stats
    'history.title': 'Historique Global des Activités & Transactions',
    'history.filter_all': 'Toutes les Activités',
    'history.admissions': 'Admissions Patients',
    'history.transactions': 'Encaissements Caisse',
    'history.pharmacy': 'Ventes Pharmacie',
    'history.appointments': 'Rendez-vous',
    'history.print_report': 'Imprimer l\'Historique',

    'stats.title': 'Bilan Statistique & Analytique Clinique',
    'stats.subtitle': 'Indicateurs financiers, activité médicale, état des malades et suivi des grossesses',
    'stats.period_today': 'Aujourd\'hui',
    'stats.period_week': '7 Derniers Jours',
    'stats.period_month': 'Ce Mois (30j)',
    'stats.period_year': 'Cette Année',
    'stats.period_all': 'Tout l\'Historique',
    'stats.total_revenue': 'Revenus Globaux Bruts',
    'stats.pharmacy_sales': 'Ventes Pharmacie',
    'stats.medicine_purchases': 'Achats Médicaments (Stock)',
    'stats.expenses': 'Dépenses & Charges',
    'stats.net_profit': 'Bénéfice Net Clinique',
    'stats.patients_count': 'Total Malades Enregistrés',
    'stats.pregnant_patients': 'Femmes Enceintes (Suivi CPN)',
    'stats.stable': 'État Stable',
    'stats.urgent': 'Urgence Relative',
    'stats.critical': 'Urgence Critique / Vitale',
    'stats.outpatient': 'Ambulatoire',
    'stats.top_pathologies': 'Top Pathologies & Motifs',
    'stats.stock_value': 'Valeur du Stock Pharmacie',
    'stats.bed_occupancy': 'Occupation Hospitalisation',
    'stats.print_analytics': 'Imprimer le Rapport Statistique',
  },

  ar: {
    // Header & Global
    'app.title': 'الشفاء',
    'app.subtitle': 'العيادة الطبية',
    'welcome': 'مرحباً',
    'logout': 'تسجيل الخروج',
    'settings': 'الإعدادات',
    'notifications': 'الإشعارات',
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'confirm': 'تأكيد',
    'delete': 'حذف',
    'print': 'طباعة',
    'download': 'تحميل',
    'close': 'إغلاق',
    'search': 'بحث...',
    'actions': 'الإجراءات',
    'date': 'التاريخ',
    'status': 'الحالة',
    'total': 'المجموع',
    'paid': 'تم الدفع',
    'unpaid': 'غير مدفوع',
    'pending': 'قيد الانتظار',
    'currency': 'فرنك غرب إفريقي',

    // Navigation Tabs
    'nav.overview': 'لوحة القيادة',
    'nav.patients': 'المرضى',
    'nav.appointments': 'المواعيد',
    'nav.prescriptions': 'الوصفات الطبية',
    'nav.pharmacy': 'الصيدلية والمخزون',
    'nav.cashier': 'الخزينة والفواتير',
    'nav.history': 'السجل',
    'nav.stats': 'الإحصائيات',

    // Buttons
    'btn.new_patient': '+ مريض جديد',
    'btn.schedule_appointment': 'جدولة موعد',
    'btn.view_file': 'الملف',
    'btn.pay_now': 'تحصيل وطباعة الإيصال',
    'btn.save_invoice': 'حفظ الفاتورة (قيد الانتظار)',
    'btn.add_medicine': '+ دواء جديد',
    'btn.empty_cart': 'إفراغ السلة',
    'btn.validate_sale': 'تأكيد البيع',

    // Patient & Medical
    'patient.name': 'الاسم واللقب',
    'patient.file_number': 'رقم الملف',
    'patient.phone': 'الهاتف',
    'patient.age': 'العمر',
    'patient.sex': 'الجنس',
    'patient.blood': 'فصيلة الدم',
    'patient.allergies': 'الحساسية',
    'patient.reason': 'سبب الزيارة',
    'patient.arrival_status': 'الحالة السريرية',
    'patient.pregnant': 'مريضة حامل',
    'patient.accompanied': 'مرفوق(ة) بمرافق',

    // Cashier & Billing
    'cashier.title': 'الصندوق والفوترة الطبية',
    'cashier.consultation': 'الاستشارة الطبية',
    'cashier.hospitalization': 'الإقامة والغرف',
    'cashier.nursing_care': 'العلاجات والحقن',
    'cashier.pharmacy': 'الأدوية والصيدلية',
    'cashier.subtotal': 'المجموع الفرعي',
    'cashier.discount': 'الخصم',
    'cashier.net_total': 'الصافي للدفع',
    'cashier.payment_method': 'طريقة الدفع',
    'cashier.cash': 'نقداً',
    'cashier.card': 'بطاقة بنكية',
    'cashier.transfer': 'تحويل بنكي',
    'cashier.cash_received': 'المبلغ المستلم',
    'cashier.change_due': 'المتبقي للإرجاع',
    'cashier.authorized_receipt': 'وصل رسمي - تصريح علاج مؤكد',

    // Pharmacy
    'pharmacy.scanner': 'مسح الباركود',
    'pharmacy.stock': 'مخزون الأدوية',
    'pharmacy.sales': 'مبيعات الشباك',
    'pharmacy.arrival_date': 'تاريخ الوصول / الدخول',
    'pharmacy.expiration_date': 'تاريخ انتهاء الصلاحية',
    'pharmacy.supplier': 'المورد / المسلم بواسطة',
    'pharmacy.supplier_phone': 'هاتف المورد',
    'pharmacy.purchase_price': 'سعر الشراء (FCFA)',
    'pharmacy.sale_price': 'سعر البيع (FCFA)',
    'pharmacy.tab.quick_sale': '🛒 شباك البيع المباشر',
    'pharmacy.tab.caisse': '💰 صندوق الصيدلية',
    'pharmacy.tab.stock': '📦 إدارة المخزون',
    'pharmacy.tab.stock_entries': '🚚 الواردات والتوريد',
    'pharmacy.tab.alerts': '⚠️ التنبيهات والصلاحية',
    'pharmacy.tab.history': '📜 سجل المبيعات',

    // Cashier Subtabs
    'cashier.tab.billing': 'فوترة العلاجات والإقامة',
    'cashier.tab.journal': 'سجل المقبوضات المالية',
    'cashier.tab.dashboard': 'حصيلة الصندوق والإيرادات',
    'cashier.tab.pharmacy_sales': 'مبيعات الصيدلية',

    // Patient Profile & Dossier
    'profile.print_dossier': 'طباعة الملف الطبي',
    'profile.unpaid_bills_detected': 'فواتير علاج معلقة غير مسددة',
    'profile.pay_at_cashier': 'السداد في الصندوق',
    'profile.tab.identity': 'الهوية والمعلومات',
    'profile.tab.care_bills': 'العلاجات والفواتير',
    'profile.tab.vitals': 'العلامات الحيوية',
    'profile.tab.appointments': 'المواعيد',
    'profile.tab.prescriptions': 'الوصفات الطبية',
    'profile.tab.labs': 'التحاليل المخبرية',

    // History & Stats
    'history.title': 'السجل الشامل للنشاطات والمعاملات',
    'history.filter_all': 'جميع النشاطات',
    'history.admissions': 'دخول المرضى',
    'history.transactions': 'مقبوضات الصندوق',
    'history.pharmacy': 'مبيعات الصيدلية',
    'history.appointments': 'المواعيد',
    'history.print_report': 'طباعة السجل',

    'stats.title': 'الحصيلة الإحصائية والتحليلية للعيادة',
    'stats.subtitle': 'المؤشرات المالية، النشاط الطبي، حالات المرضى ومتابعة الحمل',
    'stats.period_today': 'اليوم',
    'stats.period_week': 'آخر 7 أيام',
    'stats.period_month': 'هذا الشهر (30 يوم)',
    'stats.period_year': 'هذا العام',
    'stats.period_all': 'كامل السجل',
    'stats.total_revenue': 'إجمالي الإيرادات الإجمالية',
    'stats.pharmacy_sales': 'مبيعات الصيدلية',
    'stats.medicine_purchases': 'مشتريات الأدوية (المخزون)',
    'stats.expenses': 'المصاريف والرسوم',
    'stats.net_profit': 'صافي أرباح العيادة',
    'stats.patients_count': 'إجمالي المرضى المسجلين',
    'stats.pregnant_patients': 'النساء الحوامل (متابعة الحمل)',
    'stats.stable': 'حالة مستقرة',
    'stats.urgent': 'حالة عاجلة',
    'stats.critical': 'حالة حرجة / إنعاش',
    'stats.outpatient': 'علاج خارجي',
    'stats.top_pathologies': 'أبرز الأمراض ودواعي الزيارة',
    'stats.stock_value': 'قيمة مخزون الصيدلية',
    'stats.bed_occupancy': 'إشغال الإقامة والغرف',
    'stats.print_analytics': 'طباعة التقرير الإحصائي',
  },
};

export const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  isArabic: false,
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('al_shifa_lang');
    return (saved === 'ar' || saved === 'fr') ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('al_shifa_lang', lang);
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'fr');
    }
  };

  useEffect(() => {
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'fr');
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    return DICTIONARY[language]?.[key] || DICTIONARY.fr?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isArabic: language === 'ar', t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export { useLanguage } from '../hooks/useLanguage';
