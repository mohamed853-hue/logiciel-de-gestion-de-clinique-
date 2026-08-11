import { supabase } from './supabase';

/**
 * Service de génération de rapports
 * Génère des rapports financiers, pharmacie, consultations, laboratoire, soins, caisse
 * avec export PDF/CSV
 */

export interface ReportParams {
  startDate: string;
  endDate: string;
  type: 'financial' | 'pharmacy' | 'consultations' | 'laboratory' | 'nursing' | 'cashier';
  filters?: Record<string, any>;
}

/**
 * Génère un rapport financier
 */
export async function generateFinancialReport(params: ReportParams) {
  try {
    // Récupérer les transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .in('status', ['validated', 'pending']);

    // Récupérer les factures
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate);

    // Récupérer les dépenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', params.startDate)
      .lte('expense_date', params.endDate)
      .in('status', ['approved', 'paid']);

    // Récupérer les remboursements
    const { data: refunds } = await supabase
      .from('refunds')
      .select('*')
      .gte('refund_date', params.startDate)
      .lte('refund_date', params.endDate)
      .in('status', ['approved', 'processed']);

    // Calculer les totaux
    const totalRevenue = transactions?.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const totalRefunds = refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - totalRefunds;

    // Répartition par source
    const revenueBySource = transactions?.filter(t => t.type === 'revenue').reduce((acc: any, t) => {
      if (!acc[t.source]) acc[t.source] = 0;
      acc[t.source] += t.amount;
      return acc;
    }, {}) || {};

    // Répartition des dépenses par catégorie
    const expensesByCategory = expenses?.reduce((acc: any, e) => {
      if (!acc[e.category]) acc[e.category] = 0;
      acc[e.category] += e.amount;
      return acc;
    }, {}) || {};

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalRevenue,
        totalExpenses,
        totalRefunds,
        grossProfit,
        netProfit,
        totalTransactions: transactions?.length || 0,
        totalInvoices: invoices?.length || 0,
        totalExpensesCount: expenses?.length || 0,
        totalRefundsCount: refunds?.length || 0,
      },
      revenueBySource,
      expensesByCategory,
      transactions,
      invoices,
      expenses,
      refunds,
    };
  } catch (error) {
    console.error('Error generating financial report:', error);
    return null;
  }
}

/**
 * Génère un rapport pharmacie
 */
export async function generatePharmacyReport(params: ReportParams) {
  try {
    // Récupérer les ventes
    const { data: sales } = await supabase
      .from('pharmacy_sales')
      .select('*, pharmacy_sale_items(*)')
      .gte('sale_date', params.startDate)
      .lte('sale_date', params.endDate)
      .eq('status', 'completed');

    // Récupérer les entrées de stock
    const { data: stockEntries } = await supabase
      .from('pharmacy_stock_entries')
      .select('*')
      .gte('entry_date', params.startDate)
      .lte('entry_date', params.endDate);

    // Récupérer le stock actuel
    const { data: currentStock } = await supabase
      .from('pharmacy_stock')
      .select('*')
      .eq('is_active', true);

    // Calculer les totaux
    const totalSales = sales?.reduce((sum, s) => sum + s.final_amount, 0) || 0;
    const totalStockValue = currentStock?.reduce((sum, s) => sum + (s.quantity_available * s.purchase_price), 0) || 0;
    const totalStockSaleValue = currentStock?.reduce((sum, s) => sum + (s.quantity_available * s.sale_price), 0) || 0;

    // Médicaments les plus vendus
    const medicinesSold = sales?.reduce((acc: any, sale) => {
      sale.pharmacy_sale_items?.forEach((item: any) => {
        if (!acc[item.medicine_name]) {
          acc[item.medicine_name] = { quantity: 0, amount: 0 };
        }
        acc[item.medicine_name].quantity += item.quantity;
        acc[item.medicine_name].amount += item.subtotal;
      });
      return acc;
    }, {}) || {};

    const topSellingMedicines = Object.entries(medicinesSold)
      .sort((a, b) => (b[1] as any).quantity - (a[1] as any).quantity)
      .slice(0, 10);

    // Alertes de stock
    const lowStock = currentStock?.filter(s => s.quantity_available <= s.minimum_threshold) || [];
    const expired = currentStock?.filter(s => s.expiration_date && new Date(s.expiration_date) < new Date()) || [];
    const expiringSoon = currentStock?.filter(s => {
      if (!s.expiration_date) return false;
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return new Date(s.expiration_date) < thirtyDaysFromNow && new Date(s.expiration_date) >= new Date();
    }) || [];

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalSales,
        totalSalesCount: sales?.length || 0,
        totalStockValue,
        totalStockSaleValue,
        totalStockItems: currentStock?.length || 0,
        lowStockCount: lowStock.length,
        expiredCount: expired.length,
        expiringSoonCount: expiringSoon.length,
      },
      topSellingMedicines,
      lowStock,
      expired,
      expiringSoon,
      sales,
      stockEntries,
      currentStock,
    };
  } catch (error) {
    console.error('Error generating pharmacy report:', error);
    return null;
  }
}

/**
 * Génère un rapport consultations
 */
export async function generateConsultationsReport(params: ReportParams) {
  try {
    // Récupérer les factures de consultations
    const { data: consultationInvoices } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), patients(*)')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .ilike('reference', 'FAC-%');

    // Calculer les totaux
    const totalRevenue = consultationInvoices?.reduce((sum, i) => sum + i.total, 0) || 0;
    const totalPaid = consultationInvoices?.reduce((sum, i) => sum + i.paid_amount, 0) || 0;

    // Répartition par type de consultation
    const consultationsByType = consultationInvoices?.reduce((acc: any, invoice) => {
      invoice.invoice_items?.forEach((item: any) => {
        if (!acc[item.description]) {
          acc[item.description] = { count: 0, amount: 0 };
        }
        acc[item.description].count += 1;
        acc[item.description].amount += item.subtotal;
      });
      return acc;
    }, {}) || {};

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalRevenue,
        totalPaid,
        totalConsultations: consultationInvoices?.length || 0,
        unpaidAmount: totalRevenue - totalPaid,
      },
      consultationsByType,
      invoices: consultationInvoices,
    };
  } catch (error) {
    console.error('Error generating consultations report:', error);
    return null;
  }
}

/**
 * Génère un rapport laboratoire
 */
export async function generateLaboratoryReport(params: ReportParams) {
  try {
    // Récupérer les factures d'analyses
    const { data: labInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .ilike('reference', 'FAC-%');

    // Calculer les totaux
    const totalRevenue = labInvoices?.reduce((sum, i) => sum + i.total, 0) || 0;

    // Répartition par type d'analyse
    const analysesByType = labInvoices?.reduce((acc: any, invoice) => {
      // À adapter selon la structure réelle des analyses
      const analysisType = 'Analyse'; // Placeholder
      if (!acc[analysisType]) {
        acc[analysisType] = { count: 0, amount: 0 };
      }
      acc[analysisType].count += 1;
      acc[analysisType].amount += invoice.total;
      return acc;
    }, {}) || {};

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalRevenue,
        totalAnalyses: labInvoices?.length || 0,
      },
      analysesByType,
      invoices: labInvoices,
    };
  } catch (error) {
    console.error('Error generating laboratory report:', error);
    return null;
  }
}

/**
 * Génère un rapport soins
 */
export async function generateNursingReport(params: ReportParams) {
  try {
    // Récupérer les factures de soins
    const { data: nursingInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .ilike('reference', 'FAC-%');

    // Calculer les totaux
    const totalRevenue = nursingInvoices?.reduce((sum, i) => sum + i.total, 0) || 0;

    // Répartition par type de soin
    const caresByType = nursingInvoices?.reduce((acc: any, invoice) => {
      invoice.invoice_items?.forEach((item: any) => {
        if (!acc[item.description]) {
          acc[item.description] = { count: 0, amount: 0 };
        }
        acc[item.description].count += 1;
        acc[item.description].amount += item.subtotal;
      });
      return acc;
    }, {}) || {};

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalRevenue,
        totalCares: nursingInvoices?.length || 0,
      },
      caresByType,
      invoices: nursingInvoices,
    };
  } catch (error) {
    console.error('Error generating nursing report:', error);
    return null;
  }
}

/**
 * Génère un rapport caisse
 */
export async function generateCashierReport(params: ReportParams) {
  try {
    // Récupérer les transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .in('status', ['validated', 'pending']);

    // Récupérer les clôtures de caisse
    const { data: closures } = await supabase
      .from('cash_register_closures')
      .select('*')
      .gte('closure_date', params.startDate)
      .lte('closure_date', params.endDate)
      .eq('status', 'approved');

    // Calculer les totaux par méthode de paiement
    const paymentsByMethod = transactions?.reduce((acc: any, t) => {
      if (!acc[t.payment_method]) {
        acc[t.payment_method] = 0;
      }
      acc[t.payment_method] += t.amount;
      return acc;
    }, {}) || {};

    const totalCash = paymentsByMethod?.cash || 0;
    const totalCard = paymentsByMethod?.card || 0;
    const totalTransfer = paymentsByMethod?.transfer || 0;
    const totalOther = paymentsByMethod?.other || 0;

    // Écarts de clôture
    const totalVariance = closures?.reduce((sum, c) => sum + c.variance_total, 0) || 0;

    return {
      period: { start: params.startDate, end: params.endDate },
      summary: {
        totalCash,
        totalCard,
        totalTransfer,
        totalOther,
        totalTransactions: transactions?.length || 0,
        totalClosures: closures?.length || 0,
        totalVariance,
      },
      paymentsByMethod,
      transactions,
      closures,
    };
  } catch (error) {
    console.error('Error generating cashier report:', error);
    return null;
  }
}

/**
 * Exporte un rapport en CSV
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      const stringValue = typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value ?? '');
      return stringValue;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporte un rapport en PDF (simplifié - utilise window.print)
 */
export function exportToPDF(elementId: string, _filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalContent = document.body.innerHTML;
  document.body.innerHTML = element.innerHTML;
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload();
}

/**
 * Formate un rapport pour l'impression
 */
export function formatReportForPrint(report: any, type: string) {
  const clinicName = 'AL SHIFA - Clinique Médicale';
  const date = new Date().toLocaleDateString('fr-FR');
  
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af;">${clinicName}</h1>
        <h2 style="color: #64748b;">Rapport ${type.toUpperCase()}</h2>
        <p style="color: #64748b;">Période: ${report.period.start} → ${report.period.end}</p>
        <p style="color: #64748b;">Généré le: ${date}</p>
      </div>
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">Résumé</h3>
        <pre style="background: #f1f5f9; padding: 15px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(report.summary, null, 2)}</pre>
      </div>
    </div>
  `;
}
