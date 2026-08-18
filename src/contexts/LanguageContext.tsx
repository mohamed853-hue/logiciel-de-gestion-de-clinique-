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
    'app.subtitle': 'Clinique Médicale & Dispensaire',
    'welcome': 'Bienvenue',
    'welcome_safe': 'Bienvenue dans votre espace sécurisé',
    'clinic_welcome': 'Le Dispensaire Médical Al Shifa vous souhaite la bienvenue',
    'logout': 'Déconnexion',
    'settings': 'Paramètres',
    'notifications': 'Notifications',
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'confirm': 'Confirmer',
    'delete': 'Supprimer',
    'edit': 'Modifier',
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
    'refresh': 'Actualiser',
    'details': 'Détails',
    'view': 'Voir',
    'filter': 'Filtrer',
    'all': 'Tout',
    'yes': 'Oui',
    'no': 'Non',
    'loading': 'Chargement en cours...',

    // Roles
    'role.admin': 'Administrateur',
    'role.medecin': 'Médecin',
    'role.gynecologue': 'Gynécologue',
    'role.infirmier': 'Infirmier/ère',
    'role.laborantin': 'Laborantin',
    'role.receptionniste': 'Réceptionniste',
    'role.radiologue': 'Radiologue',

    // Navigation Tabs
    'nav.overview': 'Tableau de Bord',
    'nav.patients': 'Patients',
    'nav.appointments': 'Rendez-vous',
    'nav.prescriptions': 'Ordonnances',
    'nav.pharmacy': 'Pharmacie & Stock',
    'nav.cashier': 'Caisse & Factures',
    'nav.history': 'Historique',
    'nav.stats': 'Statistiques',
    'nav.lab': 'Analyses Médicales',
    'nav.labs': 'Analyses & Écho',
    'nav.requests': 'Demandes d\'Analyses',
    'nav.results': 'Résultats Validés',
    'nav.consultations': 'Consultations',
    'nav.pregnancies': 'Suivi Grossesses',
    'nav.tasks': 'Soins & Injections',
    'nav.vitals': 'Constantes Vitales',
    'nav.exams': 'Examens Radiologie',
    'nav.users': 'Gestion Utilisateurs',
    'nav.statistics': 'Statistiques Système',
    'nav.reports': 'Rapports d\'Activité',
    'nav.settings': 'Configuration',

    // Buttons
    'btn.new_patient': '+ Nouveau Patient',
    'btn.schedule_appointment': '+ Planifier RDV',
    'btn.new_prescription': '+ Nouvelle Ordonnance',
    'btn.new_lab_request': '+ Demande d\'Analyse',
    'btn.new_user': '+ Nouvel Utilisateur',
    'btn.take_vitals': '+ Prendre Constantes',
    'btn.new_radio_exam': '+ Nouvel Examen',
    'btn.enter_results': 'Saisir Résultats',
    'btn.view_file': 'Dossier',
    'btn.pay_now': 'Encaisser & Reçu',
    'btn.save_invoice': 'Enregistrer Facture',
    'btn.add_medicine': '+ Nouveau Médicament',
    'btn.empty_cart': 'Vider Panier',
    'btn.validate_sale': 'Valider la Vente',
    'btn.login': 'Accéder à mon espace',
    'btn.login_loading': 'Connexion en cours...',
    'btn.print_receipt': 'Imprimer Reçu',
    'btn.print_report': 'Imprimer Rapport',

    // Login page
    'login.title': 'Espace de Connexion',
    'login.subtitle': 'Accédez à votre espace de travail sécurisé',
    'login.email_label': 'Adresse Email',
    'login.password_label': 'Mot de Passe',
    'login.email_placeholder': 'nom@alshifa.com',
    'login.password_placeholder': '••••••••••',
    'login.security_note': 'Connexion sécurisée et cryptée · Système Médical Al Shifa',
    'login.success': 'Connexion réussie !',
    'login.error': 'Identifiants incorrects',

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
    'patient.address': 'Adresse',
    'patient.city': 'Ville',
    'patient.country': 'Pays',
    'patient.male': 'Masculin',
    'patient.female': 'Féminin',
    'patient.child': 'Enfant',
    'patient.stable': 'Stable',
    'patient.urgent': 'Urgent',
    'patient.critical': 'Critique',

    // Doctor & Consultation
    'doctor.title': 'Espace Médical & Consultations',
    'doctor.consultations_today': 'Consultations du Jour',
    'doctor.prescriptions_issued': 'Ordonnances Émises',
    'doctor.lab_pending': 'Analyses en Attente',
    'doctor.diagnostic': 'Diagnostic Médical',
    'doctor.symptoms': 'Symptômes & Observations',
    'doctor.treatment': 'Traitement Préconisé',
    'doctor.prescription_modal_title': 'Rédiger une Ordonnance Médicale',
    'doctor.lab_modal_title': 'Demande d\'Analyses Biomédicales',

    // Gynecologist
    'gyneco.title': 'Espace Gynécologie & Maternité',
    'gyneco.pregnancies_active': 'Grossesses Suivies',
    'gyneco.prenatal_visits': 'Consultations Prénatales (CPN)',
    'gyneco.ultrasounds': 'Échographies Réalisées',
    'gyneco.ddr': 'Date Dernières Règles (DDR)',
    'gyneco.term_expected': 'Terme Prévu d\'Accouchement',

    // Laboratory
    'lab.title': 'Laboratoire d\'Analyses Médicales',
    'lab.requests_count': 'Demandes d\'Analyses',
    'lab.in_progress': 'En Cours d\'Analyse',
    'lab.completed': 'Résultats Prêts & Validés',
    'lab.test_name': 'Type d\'Examen / Bilan',
    'lab.sample_type': 'Échantillon (Sang, Urine...)',
    'lab.technician': 'Technicien / Laborantin',
    'lab.validate_results': 'Valider & Publier les Résultats',
    'lab.reagents_stock': 'Réactifs & Consommables',

    // Nurse
    'nurse.title': 'Soins Infirmiers & Prise de Constantes',
    'nurse.tasks_today': 'Soins Programmés',
    'nurse.vitals_taken': 'Constantes Enregistrées',
    'nurse.tension': 'Tension Artérielle (mmHg)',
    'nurse.temp': 'Température (°C)',
    'nurse.pulse': 'Pouls (bpm)',
    'nurse.weight': 'Poids (kg)',
    'nurse.saturation': 'SpO2 (%)',
    'nurse.care_given': 'Soins Administrés',

    // Radiology
    'radio.title': 'Imagerie Médicale & Radiologie',
    'radio.exams_today': 'Examens du Jour',
    'radio.xray': 'Radiographie',
    'radio.ultrasound': 'Échographie',
    'radio.ct_scan': 'Scanner / TDM',
    'radio.conclusion': 'Compte-Rendu Radiologique',

    // Admin & Super Admin
    'admin.title': 'Administration & Supervision Clinique',
    'admin.users_count': 'Comptes Utilisateurs',
    'admin.active_accounts': 'Comptes Actifs',
    'admin.suspended_accounts': 'Comptes Suspendus',
    'admin.create_user': 'Créer un Compte Métier',
    'admin.user_role': 'Rôle Attribué',
    'admin.user_status': 'Statut du Compte',
    'admin.suspend': 'Suspendre',
    'admin.activate': 'Activer',
    'admin.reset_pwd': 'Réinitialiser MDP',
    'admin.system_stats': 'Statistiques Globales de la Clinique',
    'admin.audit_log': 'Journal d\'Activité & Sécurité',

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
    'cashier.transfer': 'Virement / Chèque',
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
    'app.subtitle': 'العيادة الطبية والمستوصف',
    'welcome': 'مرحباً',
    'welcome_safe': 'مرحباً بكم في فضائكم الصحي الآمن',
    'clinic_welcome': 'مستوصف الشفاء الطبي يرحب بكم',
    'logout': 'تسجيل الخروج',
    'settings': 'الإعدادات',
    'notifications': 'الإشعارات',
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'confirm': 'تأكيد',
    'delete': 'حذف',
    'edit': 'تعديل',
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
    'refresh': 'تحديث',
    'details': 'التفاصيل',
    'view': 'عرض',
    'filter': 'تصفية',
    'all': 'الكل',
    'yes': 'نعم',
    'no': 'لا',
    'loading': 'جاري التحميل...',

    // Roles
    'role.admin': 'مدير النظام',
    'role.medecin': 'طبيب',
    'role.gynecologue': 'طبيب(ة) نساء وتوليد',
    'role.infirmier': 'ممرض(ة)',
    'role.laborantin': 'مخبري / تقني تحاليل',
    'role.receptionniste': 'موظف(ة) الاستقبال',
    'role.radiologue': 'أخصائي أشعة',

    // Navigation Tabs
    'nav.overview': 'لوحة القيادة',
    'nav.patients': 'المرضى',
    'nav.appointments': 'المواعيد',
    'nav.prescriptions': 'الوصفات الطبية',
    'nav.pharmacy': 'الصيدلية والمخزون',
    'nav.cashier': 'الخزينة والفواتير',
    'nav.history': 'السجل العام',
    'nav.stats': 'الإحصائيات',
    'nav.lab': 'التحاليل الطبية',
    'nav.labs': 'التحاليل والأشعة',
    'nav.requests': 'طلبات التحاليل',
    'nav.results': 'النتائج المعتمدة',
    'nav.consultations': 'الاستشارات',
    'nav.pregnancies': 'متابعة الحمل',
    'nav.tasks': 'العلاجات والحقن',
    'nav.vitals': 'العلامات الحيوية',
    'nav.exams': 'فحوصات الأشعة',
    'nav.users': 'إدارة المستخدمين',
    'nav.statistics': 'إحصائيات النظام',
    'nav.reports': 'تقارير النشاط',
    'nav.settings': 'إعدادات العيادة',

    // Buttons
    'btn.new_patient': '+ مريض جديد',
    'btn.schedule_appointment': '+ جدولة موعد',
    'btn.new_prescription': '+ وصفة جديدة',
    'btn.new_lab_request': '+ طلب تحليل',
    'btn.new_user': '+ مستخدم جديد',
    'btn.take_vitals': '+ أخذ العلامات الحيوية',
    'btn.new_radio_exam': '+ فحص أشعة جديد',
    'btn.enter_results': 'إدخال النتائج',
    'btn.view_file': 'الملف',
    'btn.pay_now': 'تحصيل وإيصال',
    'btn.save_invoice': 'حفظ الفاتورة',
    'btn.add_medicine': '+ دواء جديد',
    'btn.empty_cart': 'إفراغ السلة',
    'btn.validate_sale': 'تأكيد البيع',
    'btn.login': 'الدخول إلى فضاء العمل',
    'btn.login_loading': 'جاري تسجيل الدخول...',
    'btn.print_receipt': 'طباعة الإيصال',
    'btn.print_report': 'طباعة التقرير',

    // Login page
    'login.title': 'فضاء تسجيل الدخول',
    'login.subtitle': 'سجل دخولك للوصول إلى مساحة عملك الآمنة',
    'login.email_label': 'عنوان البريد الإلكتروني',
    'login.password_label': 'كلمة المرور',
    'login.email_placeholder': 'name@alshifa.com',
    'login.password_placeholder': '••••••••••',
    'login.security_note': 'دخول آمن ومشفر بالكامل · نظام الشفاء الطبي الموحد',
    'login.success': 'تم تسجيل الدخول بنجاح !',
    'login.error': 'بيانات الدخول غير صحيحة',

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
    'patient.address': 'العنوان',
    'patient.city': 'المدينة',
    'patient.country': 'البلد',
    'patient.male': 'ذكر',
    'patient.female': 'أنثى',
    'patient.child': 'طفل',
    'patient.stable': 'مستقرة',
    'patient.urgent': 'عاجلة',
    'patient.critical': 'حرجة',

    // Doctor & Consultation
    'doctor.title': 'القسم الطبي والاستشارات',
    'doctor.consultations_today': 'استشارات اليوم',
    'doctor.prescriptions_issued': 'الوصفات الصادرة',
    'doctor.lab_pending': 'التحاليل المعلقة',
    'doctor.diagnostic': 'التشخيص الطبي',
    'doctor.symptoms': 'الأعراض والملاحظات',
    'doctor.treatment': 'العلاج المقترح',
    'doctor.prescription_modal_title': 'تحرير وصفة طبية',
    'doctor.lab_modal_title': 'طلب تحاليل مخبرية',

    // Gynecologist
    'gyneco.title': 'قسم النساء والتوليد والأمومة',
    'gyneco.pregnancies_active': 'حالات الحمل المتابعة',
    'gyneco.prenatal_visits': 'استشارات ما قبل الولادة',
    'gyneco.ultrasounds': 'فحوصات الموجات الصوتية',
    'gyneco.ddr': 'تاريخ آخر دورة شهرية',
    'gyneco.term_expected': 'التاريخ المتوقع للولادة',

    // Laboratory
    'lab.title': 'مخبر التحاليل الطبية والبيولوجية',
    'lab.requests_count': 'طلبات التحاليل',
    'lab.in_progress': 'قيد المعالجة',
    'lab.completed': 'النتائج الجاهزة والمعتمدة',
    'lab.test_name': 'نوع الفحص / التحليل',
    'lab.sample_type': 'العينة (دم، بول...)',
    'lab.technician': 'المخبري المسؤول',
    'lab.validate_results': 'اعتماد ونشر النتائج',
    'lab.reagents_stock': 'الكواشف والمستهلكات المخبرية',

    // Nurse
    'nurse.title': 'العلاجات التمريضية والعلامات الحيوية',
    'nurse.tasks_today': 'الرعاية المبرمجة',
    'nurse.vitals_taken': 'العلامات الحيوية المسجلة',
    'nurse.tension': 'ضغط الدم (mmHg)',
    'nurse.temp': 'درجة الحرارة (°C)',
    'nurse.pulse': 'النبض (bpm)',
    'nurse.weight': 'الوزن (kg)',
    'nurse.saturation': 'نسبة الأكسجين (%)',
    'nurse.care_given': 'العلاجات المقدمة',

    // Radiology
    'radio.title': 'التصوير الطبي والأشعة',
    'radio.exams_today': 'فحوصات اليوم',
    'radio.xray': 'الأشعة السينية',
    'radio.ultrasound': 'الموجات فوق الصوتية',
    'radio.ct_scan': 'الأشعة المقطعية',
    'radio.conclusion': 'التقرير الإشعاعي والخلاصة',

    // Admin & Super Admin
    'admin.title': 'لوحة الإدارة والإشراف العام',
    'admin.users_count': 'حسابات المستخدمين',
    'admin.active_accounts': 'الحسابات النشطة',
    'admin.suspended_accounts': 'الحسابات المعلقة',
    'admin.create_user': 'إنشاء حساب مستخدم',
    'admin.user_role': 'الدور الوظيفي',
    'admin.user_status': 'حالة الحساب',
    'admin.suspend': 'تعليق الحساب',
    'admin.activate': 'تنشيط الحساب',
    'admin.reset_pwd': 'إعادة تعيين كلمة السر',
    'admin.system_stats': 'الإحصائيات العامة للعيادة',
    'admin.audit_log': 'سجل النشاطات والأمان',

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
    'cashier.transfer': 'تحويل بنكي / شيك',
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
