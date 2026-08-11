import { supabase } from './supabase';
import { 
  generateInvoiceReference, 
  generatePaymentReference, 
  generateCashierReference,
  generateReceiptReference 
} from './referenceGenerator';

/**
 * Service de facturation automatique
 * Gère la création de factures, paiements et transactions caisse
 */

export interface InvoiceItem {
  item_type: 'service' | 'product' | 'medicine';
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface CreateInvoiceParams {
  patient_id: string;
  items: InvoiceItem[];
  discount?: number;
  tax?: number;
  notes?: string;
  source: 'consultation' | 'gynecology' | 'laboratory' | 'nursing' | 'pharmacy' | 'other';
  source_reference?: string;
  auto_pay?: boolean; // Si true, crée automatiquement le paiement et la transaction
  payment_method?: 'cash' | 'card' | 'transfer' | 'other';
}

export interface InvoiceResult {
  invoice: any;
  payment?: any;
  transaction?: any;
  receipt?: any;
  error?: string;
}

/**
 * Crée une facture avec ses lignes
 * Optionnellement, crée automatiquement le paiement et la transaction caisse
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<InvoiceResult> {
  try {
    // Générer une référence pour la facture
    const invoiceReference = await generateInvoiceReference();
    
    // Calculer les totaux
    const subtotal = params.items.reduce((sum, item) => sum + (item.quantity * item.unit_price - item.discount), 0);
    const discount = params.discount || 0;
    const tax = params.tax || 0;
    const total = subtotal - discount + tax;
    
    // Créer la facture
    const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert([{
      reference: invoiceReference,
      patient_id: params.patient_id,
      date: new Date().toISOString().split('T')[0],
      subtotal,
      discount,
      tax,
      total,
      paid_amount: params.auto_pay ? total : 0,
      status: params.auto_pay ? 'paid' : 'pending',
      notes: params.notes,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    }]).select().single();

    if (invoiceError) throw invoiceError;

    // Créer les lignes de facture
    const invoiceItems = params.items.map(item => ({
      invoice_id: invoice.id,
      ...item
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
    if (itemsError) throw itemsError;

    let payment, transaction, receipt;

    // Paiement automatique si demandé
    if (params.auto_pay) {
      const paymentResult = await createPayment({
        invoice_id: invoice.id,
        patient_id: params.patient_id,
        amount: total,
        payment_method: params.payment_method || 'cash',
        source: params.source,
        source_reference: params.source_reference
      });

      if (paymentResult.error) {
        return { invoice, error: paymentResult.error };
      }

      payment = paymentResult.payment;
      transaction = paymentResult.transaction;
      receipt = paymentResult.receipt;
    }

    return { invoice, payment, transaction, receipt };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { invoice: null, error: (error as any).message };
  }
}

/**
 * Crée un paiement pour une facture
 * Crée automatiquement une transaction dans la caisse
 */
export async function createPayment(params: {
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
  source?: string;
  source_reference?: string;
}): Promise<{ payment?: any; transaction?: any; receipt?: any; error?: string }> {
  try {
    const paymentReference = await generatePaymentReference();

    // Créer le paiement
    const { data: payment, error: paymentError } = await supabase.from('payments').insert([{
      reference: paymentReference,
      invoice_id: params.invoice_id,
      patient_id: params.patient_id,
      amount: params.amount,
      payment_method: params.payment_method,
      payment_date: new Date().toISOString(),
      processed_by: (await supabase.auth.getUser()).data.user?.id,
    }]).select().single();

    if (paymentError) throw paymentError;

    // Créer automatiquement une transaction dans la caisse
    const transactionResult = await createTransaction({
      type: 'revenue',
      category: params.source || 'payment',
      amount: params.amount,
      payment_method: params.payment_method,
      patient_id: params.patient_id,
      source: params.source || 'cashier',
      source_reference: params.source_reference || paymentReference,
    });

    if (transactionResult.error) {
      return { payment, error: transactionResult.error };
    }

    // Générer un reçu
    const receiptResult = await generateReceipt({
      payment_id: payment.id,
      invoice_id: params.invoice_id,
      patient_id: params.patient_id,
      amount: params.amount,
      payment_method: params.payment_method,
    });

    return { 
      payment, 
      transaction: transactionResult.transaction, 
      receipt: receiptResult.receipt 
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { error: (error as any).message };
  }
}

/**
 * Crée une transaction dans la caisse
 */
export async function createTransaction(params: {
  type: 'revenue' | 'expense' | 'adjustment' | 'refund';
  category: string;
  amount: number;
  payment_method?: string;
  patient_id?: string;
  source: string;
  source_reference?: string;
  notes?: string;
}): Promise<{ transaction?: any; error?: string }> {
  try {
    const cashierReference = await generateCashierReference();

    const { data: transaction, error } = await supabase.from('transactions').insert([{
      reference: cashierReference,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString().split('T')[1].split('.')[0],
      patient_id: params.patient_id,
      type: params.type,
      category: params.category,
      amount: params.amount,
      payment_method: params.payment_method,
      source: params.source,
      source_reference: params.source_reference,
      status: 'validated',
      notes: params.notes,
    }]).select().single();

    if (error) throw error;

    return { transaction };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { error: (error as any).message };
  }
}

/**
 * Génère un reçu pour un paiement
 */
export async function generateReceipt(params: {
  payment_id: string;
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: string;
}): Promise<{ receipt?: any; error?: string }> {
  try {
    const receiptReference = await generateReceiptReference();

    const { data: receipt, error } = await supabase.from('receipts').insert([{
      reference: receiptReference,
      payment_id: params.payment_id,
      invoice_id: params.invoice_id,
      patient_id: params.patient_id,
      amount: params.amount,
      payment_method: params.payment_method,
      printed: false,
    }]).select().single();

    if (error) throw error;

    return { receipt };
  } catch (error) {
    console.error('Error generating receipt:', error);
    return { error: (error as any).message };
  }
}

/**
 * Crée une facture pour une consultation médicale
 */
export async function createConsultationInvoice(params: {
  patient_id: string;
  consultation_type: string;
  amount: number;
  doctor_name?: string;
  notes?: string;
}): Promise<InvoiceResult> {
  return createInvoice({
    patient_id: params.patient_id,
    items: [{
      item_type: 'service',
      description: `Consultation: ${params.consultation_type}`,
      quantity: 1,
      unit_price: params.amount,
      discount: 0
    }],
    notes: params.notes ? `${params.notes} - Médecin: ${params.doctor_name}` : `Médecin: ${params.doctor_name}`,
    source: 'consultation',
    auto_pay: false // Le paiement se fait à la caisse
  });
}

/**
 * Crée une facture pour une consultation gynécologique
 */
export async function createGynecologyInvoice(params: {
  patient_id: string;
  service_type: string;
  amount: number;
  doctor_name?: string;
  notes?: string;
}): Promise<InvoiceResult> {
  return createInvoice({
    patient_id: params.patient_id,
    items: [{
      item_type: 'service',
      description: `Gynécologie: ${params.service_type}`,
      quantity: 1,
      unit_price: params.amount,
      discount: 0
    }],
    notes: params.notes ? `${params.notes} - Médecin: ${params.doctor_name}` : `Médecin: ${params.doctor_name}`,
    source: 'gynecology',
    auto_pay: false
  });
}

/**
 * Crée une facture pour une analyse de laboratoire
 */
export async function createLabInvoice(params: {
  patient_id: string;
  analysis_type: string;
  amount: number;
  notes?: string;
}): Promise<InvoiceResult> {
  return createInvoice({
    patient_id: params.patient_id,
    items: [{
      item_type: 'service',
      description: `Analyse: ${params.analysis_type}`,
      quantity: 1,
      unit_price: params.amount,
      discount: 0
    }],
    notes: params.notes,
    source: 'laboratory',
    auto_pay: false
  });
}

/**
 * Crée une facture pour un soin infirmier
 */
export async function createNursingInvoice(params: {
  patient_id: string;
  care_type: string;
  amount: number;
  nurse_name?: string;
  notes?: string;
}): Promise<InvoiceResult> {
  return createInvoice({
    patient_id: params.patient_id,
    items: [{
      item_type: 'service',
      description: `Soin: ${params.care_type}`,
      quantity: 1,
      unit_price: params.amount,
      discount: 0
    }],
    notes: params.notes ? `${params.notes} - Infirmier: ${params.nurse_name}` : `Infirmier: ${params.nurse_name}`,
    source: 'nursing',
    auto_pay: false
  });
}

/**
 * Traite un paiement partiel sur une facture
 */
export async function processPartialPayment(params: {
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
}): Promise<{ payment?: any; transaction?: any; receipt?: any; error?: string }> {
  try {
    // Vérifier que le montant ne dépasse pas le reste à payer
    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', params.invoice_id).single();
    
    if (!invoice) {
      return { error: 'Facture non trouvée' };
    }

    const remainingAmount = invoice.total - invoice.paid_amount;
    if (params.amount > remainingAmount) {
      return { error: `Le montant dépasse le reste à payer (${remainingAmount} DH)` };
    }

    return createPayment({
      invoice_id: params.invoice_id,
      patient_id: params.patient_id,
      amount: params.amount,
      payment_method: params.payment_method
    });
  } catch (error) {
    console.error('Error processing partial payment:', error);
    return { error: (error as any).message };
  }
}

/**
 * Annule une facture
 */
export async function cancelInvoice(invoiceId: string, reason: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('invoices').update({ 
      status: 'cancelled',
      notes: reason
    }).eq('id', invoiceId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return { error: (error as any).message };
  }
}

/**
 * Récupère les factures impayées d'un patient
 */
export async function getUnpaidInvoices(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['pending', 'partially_paid'])
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    return [];
  }
}

/**
 * Récupère les détails d'une facture avec ses lignes
 */
export async function getInvoiceDetails(invoiceId: string) {
  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) throw itemsError;

    return { ...invoice, items };
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return null;
  }
}
