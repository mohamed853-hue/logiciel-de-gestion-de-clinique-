import { supabase } from './supabase';

/**
 * Service de génération de références automatiques
 * Permet de générer des références uniques pour toutes les opérations financières
 */

type ReferenceType = 
  | 'patient'      // P-XXXXX
  | 'consultation' // CONS-XXXXX
  | 'invoice'      // FAC-XXXXX
  | 'payment'      // PAY-XXXXX
  | 'cashier'      // CAIS-XXXXX
  | 'sale'         // VTE-XXXXX
  | 'stock_entry'  // ENT-XXXXX
  | 'prescription' // ORD-XXXXX
  | 'expense'      // DEP-XXXXX
  | 'refund'       // REM-XXXXX
  | 'receipt'      // REC-XXXXX
  | 'closure'      // CLO-XXXXX
  | 'nursing'      // SOIN-XXXXX
  | 'lab'          // LAB-XXXXX
  | 'radio'        // RAD-XXXXX
  | 'ultrasound'   // ECHO-XXXXX;

const REFERENCE_PREFIXES: Record<ReferenceType, string> = {
  patient: 'P',
  consultation: 'CONS',
  invoice: 'FAC',
  payment: 'PAY',
  cashier: 'CAIS',
  sale: 'VTE',
  stock_entry: 'ENT',
  prescription: 'ORD',
  expense: 'DEP',
  refund: 'REM',
  receipt: 'REC',
  closure: 'CLO',
  nursing: 'SOIN',
  lab: 'LAB',
  radio: 'RAD',
  ultrasound: 'ECHO',
};

/**
 * Génère une référence unique pour un type donné
 * Utilise la fonction SQL generate_reference de Supabase
 */
export async function generateReference(type: ReferenceType): Promise<string> {
  const prefix = REFERENCE_PREFIXES[type];
  
  try {
    const { data, error } = await supabase.rpc('generate_reference', { prefix });
    
    if (error) {
      console.error('Error generating reference:', error);
      // Fallback: générer une référence localement
      return generateReferenceFallback(prefix);
    }
    
    return data || generateReferenceFallback(prefix);
  } catch (error) {
    console.error('Error calling generate_reference:', error);
    return generateReferenceFallback(prefix);
  }
}

/**
 * Fallback local pour générer une référence si la fonction SQL échoue
 */
function generateReferenceFallback(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Valide le format d'une référence
 */
export function validateReference(reference: string): boolean {
  const pattern = /^[A-Z]+-\d{6,}$/;
  return pattern.test(reference);
}

/**
 * Extrait le type d'une référence
 */
export function getReferenceType(reference: string): ReferenceType | null {
  const prefix = reference.split('-')[0];
  
  for (const [type, typePrefix] of Object.entries(REFERENCE_PREFIXES)) {
    if (typePrefix === prefix) {
      return type as ReferenceType;
    }
  }
  
  return null;
}

/**
 * Formate une référence pour l'affichage
 */
export function formatReference(reference: string): string {
  return reference.toUpperCase();
}

/**
 * Génère une référence de patient
 */
export async function generatePatientReference(): Promise<string> {
  return generateReference('patient');
}

/**
 * Génère une référence de facture
 */
export async function generateInvoiceReference(): Promise<string> {
  return generateReference('invoice');
}

/**
 * Génère une référence de paiement
 */
export async function generatePaymentReference(): Promise<string> {
  return generateReference('payment');
}

/**
 * Génère une référence de transaction caisse
 */
export async function generateCashierReference(): Promise<string> {
  return generateReference('cashier');
}

/**
 * Génère une référence de vente pharmacie
 */
export async function generateSaleReference(): Promise<string> {
  return generateReference('sale');
}

/**
 * Génère une référence d'ordonnance
 */
export async function generatePrescriptionReference(): Promise<string> {
  return generateReference('prescription');
}

/**
 * Génère une référence de dépense
 */
export async function generateExpenseReference(): Promise<string> {
  return generateReference('expense');
}

/**
 * Génère une référence de remboursement
 */
export async function generateRefundReference(): Promise<string> {
  return generateReference('refund');
}

/**
 * Génère une référence de reçu
 */
export async function generateReceiptReference(): Promise<string> {
  return generateReference('receipt');
}

/**
 * Génère une référence de soin infirmier
 */
export async function generateNursingReference(): Promise<string> {
  return generateReference('nursing');
}

/**
 * Génère une référence d'analyse laboratoire
 */
export async function generateLabReference(): Promise<string> {
  return generateReference('lab');
}

/**
 * Génère une référence de radiologie
 */
export async function generateRadioReference(): Promise<string> {
  return generateReference('radio');
}

/**
 * Génère une référence d'échographie
 */
export async function generateUltrasoundReference(): Promise<string> {
  return generateReference('ultrasound');
}

/**
 * Génère une référence d'entrée en stock
 */
export async function generateStockEntryReference(): Promise<string> {
  return generateReference('stock_entry');
}
