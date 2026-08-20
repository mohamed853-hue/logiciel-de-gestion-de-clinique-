import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Printer, 
} from 'lucide-react';
import type { Patient, PatientDiagnostic, GynAccouchement } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useClinicSettings } from '../services/clinicSettingsService';
import { cn } from '../utils/cn';

export type ReportType = 'pharmacy' | 'finance' | 'patients' | 'epidemiology' | 'maternity' | 'labs';
export type ReportPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

interface AdminReportsTabProps {
  patients: Patient[];
  diagnostics: PatientDiagnostic[];
  carePayments: any[];
  pharmacySales: any[];
  pharmacyStock?: any[];
  pharmacyMovements?: any[];
  caisseExpenses?: any[];
  labTests?: any[];
  births?: GynAccouchement[];
}

export function AdminReportsTab({
  patients,
  diagnostics,
  carePayments,
  pharmacySales,
  pharmacyStock = [],
  pharmacyMovements = [],
  caisseExpenses = [],
  labTests = [],
  births = [],
}: AdminReportsTabProps) {
  const { isArabic } = useLanguage();
  const { settings } = useClinicSettings();
  const [selectedReport, setSelectedReport] = useState<ReportType>('finance');
  const [period, setPeriod] = useState<ReportPeriod>('month');

  // Filtrage générique par date
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr || period === 'all') return true;
    const now = new Date();
    const d = new Date(dateStr);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Données filtrées
  const filteredPatients = useMemo(() => patients.filter(p => isDateInPeriod(p.created_at)), [patients, period]);
  const filteredDiagnostics = useMemo(() => diagnostics.filter(d => isDateInPeriod(d.created_at)), [diagnostics, period]);
  const filteredCarePayments = useMemo(() => carePayments.filter(p => isDateInPeriod(p.created_at)), [carePayments, period]);
  const filteredPharmacySales = useMemo(() => pharmacySales.filter(s => isDateInPeriod(s.created_at)), [pharmacySales, period]);
  const filteredExpenses = useMemo(() => caisseExpenses.filter(e => isDateInPeriod(e.created_at || e.date_depense)), [caisseExpenses, period]);
  const filteredMovements = useMemo(() => pharmacyMovements.filter(m => isDateInPeriod(m.created_at)), [pharmacyMovements, period]);
  const filteredBirths = useMemo(() => births.filter(b => isDateInPeriod(b.date_naissance || b.created_at)), [births, period]);
  const filteredLabs = useMemo(() => labTests.filter(l => isDateInPeriod(l.created_at)), [labTests, period]);

  // Totaux financiers
  const totalCareRev = useMemo(() => filteredCarePayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0), [filteredCarePayments]);
  const totalPharmRev = useMemo(() => filteredPharmacySales.reduce((acc, s) => acc + (parseFloat(s.total_price) || 0), 0), [filteredPharmacySales]);
  const totalGrossRev = totalCareRev + totalPharmRev;
  const totalExp = useMemo(() => filteredExpenses.reduce((acc, e) => acc + (parseFloat(e.montant) || 0), 0), [filteredExpenses]);
  const netProfit = totalGrossRev - totalExp;

  // Valeur du stock pharmacie
  const totalStockValue = useMemo(() => pharmacyStock.reduce((acc, item) => acc + ((parseFloat(item.prix_achat) || parseFloat(item.prix) || 0) * (item.qte || 0)), 0), [pharmacyStock]);
  const totalStockItemsCount = useMemo(() => pharmacyStock.reduce((acc, item) => acc + (item.qte || 0), 0), [pharmacyStock]);

  const handlePrint = () => {
    window.print();
  };

  const periodLabels = {
    today: isArabic ? 'اليوم' : 'Aujourd\'hui',
    week: isArabic ? 'آخر 7 أيام' : '7 Derniers Jours',
    month: isArabic ? 'هذا الشهر' : 'Ce Mois-ci',
    year: isArabic ? 'هذه السنة' : 'Cette Année',
    all: isArabic ? 'كامل السجل' : 'Tout l\'Historique',
  };

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ─── BANNIÈRE DE SÉLECTION DU RAPPORT ──────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            {isArabic ? 'مركز التقارير والكشوفات الرسمية للعيادة' : 'Centre des Rapports & Bilans d\'Activité'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isArabic ? 'توليد تقارير مالية، صيدلانية، سريرية، إحصاءات الولادات والأوبئة مع خيار الطباعة المباشرة' : 'Édition de rapports détaillés : stocks, caisse, épidémiologie, naissances et fréquentation.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sélecteur de période */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            {(['today', 'week', 'month', 'year', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                  period === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            {isArabic ? 'طباعة التقرير (A4)' : 'Imprimer le Rapport (A4)'}
          </button>
        </div>
      </div>

      {/* ─── ONGLETS DES TYPES DE RAPPORTS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { id: 'finance', label: isArabic ? '💰 المالية والخزينة' : '💰 Finances & Caisse', desc: isArabic ? 'المداخيل والمصاريف' : 'Recettes & Dépenses' },
          { id: 'pharmacy', label: isArabic ? '💊 الصيدلية والمخزون' : '💊 Pharmacie & Stock', desc: isArabic ? 'الوارد والمنصرف' : 'Entrées / Sorties' },
          { id: 'patients', label: isArabic ? '👥 المرضى والتطور' : '👥 Fréquentation & Soins', desc: isArabic ? 'حالات الاستقبال' : 'Admissions & Guérisons' },
          { id: 'epidemiology', label: isArabic ? '🩺 الأمراض والأوبئة' : '🩺 Épidémiologie', desc: isArabic ? 'التشخيصات والخطورة' : 'Pathologies Recensées' },
          { id: 'maternity', label: isArabic ? '👶 الأمومة والولادات' : '👶 Maternité & Naissances', desc: isArabic ? 'الحوامل والأطفال' : 'Nouveau-nés & CPN' },
          { id: 'labs', label: isArabic ? '🔬 التحاليل والمخبر' : '🔬 Laboratoire & Examens', desc: isArabic ? 'الفحوصات المنجزة' : 'Analyses Réalisées' },
        ].map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedReport(r.id as ReportType)}
            className={cn(
              'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between',
              selectedReport === r.id
                ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <p className="font-extrabold text-xs text-slate-800 truncate">{r.label}</p>
            <p className="text-[10px] text-slate-400 mt-1">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* ─── CORPS DU RAPPORT SÉLECTIONNÉ (FORMAT IMPRIMABLE ET VISUEL) ──────── */}
      <div id="printable-report-card" className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">

        {/* Entête officiel du rapport */}
        <div className="flex items-center justify-between border-b pb-5 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              🏥
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">{settings.clinicName || 'DISPENSAIRE MÉDICAL AL SHIFA'}</h1>
              <p className="text-xs text-slate-500">{settings.clinicAddress || 'Service Médical & Hospitalier'} · Tél : {settings.clinicPhone || '+222 45 00 00 00'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 inline-block">
              {isArabic ? 'تقرير رسمي معتمد' : 'RAPPORT OFFICIEL DE GESTION'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {isArabic ? 'الفترة :' : 'Période :'} <strong>{periodLabels[period]}</strong> · {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 1 : FINANCIER & TRÉSORERIE
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">{isArabic ? 'إجمالي المداخيل' : 'Recettes Brutes'}</p>
                <p className="text-xl font-black text-emerald-700 mt-1">{totalGrossRev.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-emerald-600 mt-1">{filteredCarePayments.length + filteredPharmacySales.length} encaissements</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <p className="text-[11px] font-bold text-blue-800 uppercase">{isArabic ? 'استشارات وعلاجات' : 'Recettes Clinique'}</p>
                <p className="text-xl font-black text-blue-700 mt-1">{totalCareRev.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-blue-600 mt-1">{filteredCarePayments.length} actes</p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase">{isArabic ? 'مبيعات الأدوية' : 'Recettes Pharmacie'}</p>
                <p className="text-xl font-black text-purple-700 mt-1">{totalPharmRev.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-purple-600 mt-1">{filteredPharmacySales.length} ventes</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="text-[11px] font-bold text-rose-800 uppercase">{isArabic ? 'المصاريف والنفقات' : 'Dépenses'}</p>
                <p className="text-xl font-black text-rose-700 mt-1">{totalExp.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-rose-600 mt-1">{filteredExpenses.length} pièces</p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                <p className="text-[11px] font-bold text-teal-800 uppercase">{isArabic ? 'صافي الأرباح' : 'Solde Net'}</p>
                <p className="text-xl font-black text-teal-700 mt-1">{netProfit.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-teal-600 mt-1">{netProfit >= 0 ? '✓ Excédentaire' : '⚠️ Déficitaire'}</p>
              </div>
            </div>

            {/* Tableau récapitulatif des encaissements */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800">{isArabic ? 'تفاصيل المقبوضات حسب المصدر' : 'Détail des Encaissements par Catégorie'}</h3>
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b">
                    <tr>
                      <th className="p-3">Source / Prestation</th>
                      <th className="p-3">Nombre d'Actes</th>
                      <th className="p-3">Montant Total</th>
                      <th className="p-3">Part dans les Recettes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-bold text-slate-800">🩺 Consultations & Soins Médicaux</td>
                      <td className="p-3 font-mono">{filteredCarePayments.length}</td>
                      <td className="p-3 font-black text-blue-700 font-mono">{totalCareRev.toLocaleString()} FCFA</td>
                      <td className="p-3 font-bold">{totalGrossRev > 0 ? ((totalCareRev / totalGrossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800">💊 Ventes Pharmacie & Médicaments</td>
                      <td className="p-3 font-mono">{filteredPharmacySales.length}</td>
                      <td className="p-3 font-black text-purple-700 font-mono">{totalPharmRev.toLocaleString()} FCFA</td>
                      <td className="p-3 font-bold">{totalGrossRev > 0 ? ((totalPharmRev / totalGrossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr className="bg-slate-50 font-black">
                      <td className="p-3 uppercase">Total Recettes Brutes</td>
                      <td className="p-3">{filteredCarePayments.length + filteredPharmacySales.length}</td>
                      <td className="p-3 text-emerald-700">{totalGrossRev.toLocaleString()} FCFA</td>
                      <td className="p-3">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 2 : PHARMACIE & STOCK
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'pharmacy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                <p className="text-[11px] font-bold text-indigo-800 uppercase">{isArabic ? 'قيمة المخزون الحالي' : 'Valeur Estimée du Stock'}</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">{totalStockValue.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-indigo-600 mt-1">{totalStockItemsCount} unités en stock</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">{isArabic ? 'المبيعات المنفذة' : 'Sorties / Ventes Pharmacie'}</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{totalPharmRev.toLocaleString()} FCFA</p>
                <p className="text-[10px] text-emerald-600 mt-1">{filteredPharmacySales.length} tickets de caisse</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 uppercase">{isArabic ? 'عدد الأصناف المسجلة' : 'Références Médicaments'}</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{pharmacyStock.length}</p>
                <p className="text-[10px] text-amber-600 mt-1">Produits actifs en officine</p>
              </div>
            </div>

            {/* Tableau des mouvements récents de pharmacie */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800">{isArabic ? 'سجل حركة المنتجات (الوارد والمنصرف)' : 'Historique des Mouvements de Stock'}</h3>
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b">
                    <tr>
                      <th className="p-3">Médicament / Produit</th>
                      <th className="p-3">Type de Mouvement</th>
                      <th className="p-3">Quantité</th>
                      <th className="p-3">Montant Total</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMovements.slice(0, 15).map(m => (
                      <tr key={m.id}>
                        <td className="p-3 font-bold text-slate-800">{m.medicament_nom}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded-md font-bold text-[10px]', m.type_mouvement === 'achat' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')}>
                            {m.type_mouvement === 'achat' ? '📥 Entrée Stock' : '📤 Vente Sortie'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold">{m.qte}</td>
                        <td className="p-3 font-mono">{m.montant_total ? `${m.montant_total.toLocaleString()} FCFA` : '—'}</td>
                        <td className="p-3 text-slate-400 text-[10px]">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                    {filteredMovements.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Aucun mouvement enregistré pour cette période.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 3 : PATIENTS, ADMISSIONS & ÉVOLUTION CLINIQUE
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'patients' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <p className="text-[11px] font-bold text-blue-800 uppercase">{isArabic ? 'إجمالي المرضى' : 'Total Admissions'}</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{filteredPatients.length}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">{isArabic ? 'تم الشفاء / عولجوا' : 'Guéris / Traités'}</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {filteredDiagnostics.filter(d => d.evolution_status === 'gueri').length}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 uppercase">{isArabic ? 'قيد العلاج والمتابعة' : 'En Traitement Actif'}</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {filteredDiagnostics.filter(d => d.evolution_status === 'en_traitement').length}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase">{isArabic ? 'أمراض مزمنة' : 'Cas Chroniques'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {filteredDiagnostics.filter(d => d.evolution_status === 'chronique').length}
                </p>
              </div>
            </div>

            {/* Répartition de l'état clinique à l'arrivée */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800">{isArabic ? 'توزيع المرضى حسب الحالة السريرية عند الوصول' : 'Répartition de la Gravité à l\'Admission'}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Stable', count: filteredPatients.filter(p => (p.arrival_status || 'stable') === 'stable').length, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  { label: 'À Surveiller', count: filteredPatients.filter(p => p.arrival_status === 'surveiller').length, color: 'bg-blue-100 text-blue-800 border-blue-200' },
                  { label: 'Urgent', count: filteredPatients.filter(p => p.arrival_status === 'urgent').length, color: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { label: 'Grave', count: filteredPatients.filter(p => p.arrival_status === 'grave').length, color: 'bg-orange-100 text-orange-800 border-orange-200' },
                  { label: 'Critique', count: filteredPatients.filter(p => p.arrival_status === 'critique').length, color: 'bg-rose-100 text-rose-800 border-rose-200' },
                ].map(item => (
                  <div key={item.label} className={cn('p-3 rounded-2xl border text-center', item.color)}>
                    <p className="text-xl font-black">{item.count}</p>
                    <p className="text-xs font-bold mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 4 : ÉPIDÉMIOLOGIE & PATHOLOGIES
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'epidemiology' && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-sm text-slate-800">{isArabic ? 'جدول توزيع الأمراض والتشخيصات الطبية المعتمدة' : 'Bilan Épidémiologique des Diagnostics Posés'}</h3>
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b">
                  <tr>
                    <th className="p-3">Pathologie / Maladie</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Nombre de Cas</th>
                    <th className="p-3">Cas Graves / Critiques</th>
                    <th className="p-3">Taux de Guérison</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(
                    filteredDiagnostics.reduce((acc: Record<string, { total: number; severe: number; healed: number; category: string }>, d) => {
                      const name = d.disease_name;
                      if (!acc[name]) acc[name] = { total: 0, severe: 0, healed: 0, category: d.category || 'Général' };
                      acc[name].total++;
                      if (d.severity === 'grave' || d.severity === 'critique') acc[name].severe++;
                      if (d.evolution_status === 'gueri') acc[name].healed++;
                      return acc;
                    }, {})
                  ).map(([name, data]) => (
                    <tr key={name}>
                      <td className="p-3 font-extrabold text-slate-900">{name}</td>
                      <td className="p-3 text-slate-500">{data.category}</td>
                      <td className="p-3 font-mono font-black text-slate-800">{data.total}</td>
                      <td className="p-3">
                        <span className={cn('px-2 py-0.5 rounded-md font-bold text-[10px]', data.severe > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600')}>
                          {data.severe} cas
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {data.total > 0 ? ((data.healed / data.total) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
                  {filteredDiagnostics.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Aucun diagnostic enregistré sur cette période.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 5 : MATERNITÉ & NAISSANCES
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'maternity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200">
                <p className="text-[11px] font-bold text-pink-800 uppercase">{isArabic ? 'إجمالي المواليد' : 'Naissances Totales'}</p>
                <p className="text-2xl font-black text-pink-700 mt-1">{filteredBirths.length}</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <p className="text-[11px] font-bold text-blue-800 uppercase">{isArabic ? 'ذكور' : 'Garçons (M)'}</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {filteredBirths.filter(b => b.sexe_bebe === 'M').length}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="text-[11px] font-bold text-rose-800 uppercase">{isArabic ? 'إناث' : 'Filles (F)'}</p>
                <p className="text-2xl font-black text-rose-700 mt-1">
                  {filteredBirths.filter(b => b.sexe_bebe === 'F').length}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase">{isArabic ? 'عمليات قيصرية' : 'Césariennes'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {filteredBirths.filter(b => b.type_accouchement === 'cesarienne').length}
                </p>
              </div>
            </div>

            {/* Registre des naissances */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800">{isArabic ? 'سجل المواليد المفصل' : 'Registre des Nouveau-nés'}</h3>
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b">
                    <tr>
                      <th className="p-3">Nouveau-né</th>
                      <th className="p-3">Mère</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Poids & Taille</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">APGAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBirths.map(b => (
                      <tr key={b.id}>
                        <td className="p-3 font-extrabold text-slate-900">{b.prenom_bebe || 'Bébé'} {b.nom_bebe} ({b.sexe_bebe})</td>
                        <td className="p-3 text-slate-700">{b.mother_name}</td>
                        <td className="p-3 text-slate-600">{b.date_naissance ? new Date(b.date_naissance).toLocaleDateString('fr-FR') : '--'}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{b.poids_bebe_grammes ? `${(b.poids_bebe_grammes / 1000).toFixed(2)} kg` : '--'}</td>
                        <td className="p-3 capitalize">{b.type_accouchement?.replace('_', ' ')}</td>
                        <td className="p-3 font-mono font-bold text-rose-600">{b.apgar_1min || 9}/{b.apgar_5min || 10}</td>
                      </tr>
                    ))}
                    {filteredBirths.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">Aucune naissance répertoriée pour cette période.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RAPPORT 6 : LABORATOIRE & EXAMENS
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedReport === 'labs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <p className="text-[11px] font-bold text-purple-800 uppercase">{isArabic ? 'إجمالي التحاليل المطلوبة' : 'Analyses Demandées'}</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{filteredLabs.length}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">{isArabic ? 'نتائج منجزة ومعتمدة' : 'Bulletins Validés'}</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {filteredLabs.filter(l => l.status === 'termine').length}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 uppercase">{isArabic ? 'فحوصات قيد الانتظار' : 'En Attente'}</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {filteredLabs.filter(l => l.status === 'en_attente').length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── CADRE DE SIGNATURE & VISA OFFICIEL ──────────────────────────────── */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-700">
          <div>
            <p className="font-bold text-slate-800">{isArabic ? 'مسؤول الإحصاء والتدقيق :' : 'Responsable Statistiques & Contrôle :'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{isArabic ? 'تم التحقق من مطابقة البيانات' : 'Données certifiées conformes au registre'}</p>
            <div className="h-14 mt-2 border-b border-dashed border-slate-300" />
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-800">{isArabic ? 'تأشيرة وخاتم إدارة العيادة :' : 'Visa & Cachet de la Direction Médicale :'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{settings.clinicName || 'Clinique Al Shifa'}</p>
            <div className="h-14 mt-2 border-b border-dashed border-slate-300" />
          </div>
        </div>

      </div>
    </div>
  );
}
