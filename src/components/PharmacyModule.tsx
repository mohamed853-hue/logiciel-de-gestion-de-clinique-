import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Receipt } from './Receipt';
import type { ReceiptData } from './Receipt';
import { Toast } from './Toast';
import type { ToastMessage } from './Toast';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  History,
  Search,
  Plus,
  XCircle,
  CheckCircle,
  DollarSign,
  Truck,
  CreditCard,
  Trash2,
  Edit,
  RotateCcw,
  Barcode,
  User,
  RefreshCw,
  Clock,
  TrendingUp,
  Printer,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import { generateReference } from '../services/referenceGenerator';
import { getClinicSettings } from '../services/clinicSettingsService';
import { useLanguage } from '../hooks/useLanguage';
import {
  ModalShell,
  FormSection,
  FormField,
  ModalInput,
  CancelButton,
  SubmitButton,
} from './ModalShell';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type PharmacyTab =
  | 'quick-sale'
  | 'caisse'
  | 'prescriptions'
  | 'stock'
  | 'stock-entries'
  | 'alerts'
  | 'history';

export interface PharmacyStockItem {
  id: string;
  medicine_name: string;
  medicine_code?: string;
  barcode?: string;
  category?: string;
  laboratory?: string;
  supplier?: string;
  supplier_phone?: string;
  quantity_available: number;
  minimum_threshold: number;
  purchase_price: number;
  sale_price: number;
  lot_number?: string;
  entry_date?: string;
  expiration_date?: string;
  location?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CartItem {
  stock_id: string;
  medicine_name: string;
  medicine_code?: string;
  barcode?: string;
  quantity: number;
  available_stock: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  reference: string;
  patient_id?: string | null;
  patient_name?: string;
  prescription_id?: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  sale_date: string;
  sold_by?: string;
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  refund_to_stock?: boolean;
  refund_reason?: string;
  refund_date?: string;
  created_at: string;
  items?: SaleItemRecord[];
}

export interface SaleItemRecord {
  id?: string;
  sale_id?: string;
  stock_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface StockEntryRecord {
  id: string;
  reference: string;
  stock_id: string;
  medicine_name?: string;
  supplier: string;
  quantity: number;
  purchase_price: number;
  lot_number?: string;
  expiration_date?: string;
  entry_date: string;
  notes?: string;
  created_at: string;
}

export interface PharmacyModuleProps {
  initialTab?: PharmacyTab;
  preloadedPrescription?: any | null;
}

// Catégories par défaut si aucune n'est trouvée
const MEDICINE_CATEGORIES = [
  'Tous',
  'Antibiotiques',
  'Antalgiques / Antipyrétiques',
  'Anti-inflammatoires',
  'Cardiologie',
  'Gastro-entérologie',
  'Pneumologie',
  'Dermatologie',
  'Vitamines & Compléments',
  'Injectables & Perfusions',
  'Matériel & Pansements',
  'Autres'
];

export function PharmacyModule({
  initialTab = 'quick-sale',
  preloadedPrescription = null,
}: PharmacyModuleProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<PharmacyTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [stock, setStock] = useState<PharmacyStockItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Scanner & Vente
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'insurance'>('cash');
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Modal Reçu
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Ventes & Caisse
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntryRecord[]>([]);

  // Modals Stock & Entrées
  const [showNewStockModal, setShowNewStockModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<PharmacyStockItem | null>(null);
  const [showStockEntryModal, setShowStockEntryModal] = useState(false);
  const [selectedStockForEntry, setSelectedStockForEntry] = useState<PharmacyStockItem | null>(null);

  // Modal Remboursement
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<SaleRecord | null>(null);
  const [refundToStock, setRefundToStock] = useState(true);
  const [refundReason, setRefundReason] = useState('Retour patient / Non utilisé');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Formulaire nouveau médicament
  const [newMedicineForm, setNewMedicineForm] = useState<Partial<PharmacyStockItem>>({
    medicine_name: '',
    medicine_code: '',
    barcode: '',
    category: 'Antalgiques / Antipyrétiques',
    laboratory: '',
    supplier: '',
    quantity_available: 10,
    minimum_threshold: 5,
    purchase_price: 0,
    sale_price: 0,
    lot_number: '',
    expiration_date: '',
    location: 'Rayon A1',
    is_active: true,
  });

  // Suggestions et autocomplétion de médicaments
  const [medSuggestions, setMedSuggestions] = useState<any[]>([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [matchingStockFound, setMatchingStockFound] = useState<PharmacyStockItem | null>(null);

  // Formulaire entrée de stock
  const [stockEntryForm, setStockEntryForm] = useState({
    supplier: '',
    quantity: 10,
    purchase_price: 0,
    lot_number: '',
    expiration_date: '',
    notes: '',
  });

  // ─── CHARGER UNE ORDONNANCE DANS LE PANIER ────────────────────────────────
  const handleLoadPrescriptionToCart = useCallback((prescription: any) => {
    if (!prescription || !prescription.items || !Array.isArray(prescription.items)) return;

    // Trouver le patient lié
    if (prescription.patient_id) {
      const targetPatient = patients.find(p => p.id === prescription.patient_id);
      if (targetPatient) setSelectedPatient(targetPatient);
    }

    const newCartItems: CartItem[] = [];
    prescription.items.forEach((pItem: any) => {
      const medName = pItem.medicament || pItem.medicine_name || '';
      // Rechercher dans le stock
      const matchedStock = stock.find(
        s => s.medicine_name.toLowerCase().includes(medName.toLowerCase()) ||
             medName.toLowerCase().includes(s.medicine_name.toLowerCase())
      );

      const qty = parseInt(pItem.quantite || pItem.quantity || '1', 10) || 1;

      if (matchedStock) {
        newCartItems.push({
          stock_id: matchedStock.id,
          medicine_name: matchedStock.medicine_name,
          medicine_code: matchedStock.medicine_code,
          barcode: matchedStock.barcode,
          quantity: qty,
          available_stock: matchedStock.quantity_available,
          unit_price: matchedStock.sale_price,
          discount: 0,
          subtotal: matchedStock.sale_price * qty,
        });
      }
    });

    if (newCartItems.length > 0) {
      setCart(newCartItems);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ordonnance Chargée dans le Panier',
        description: `${newCartItems.length} médicament(s) identifié(s) dans le stock disponibles.`,
      });
    }
  }, [patients, stock]);

  // Synchroniser avec l'onglet initial reçu en prop
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Traiter une ordonnance préchargée transmise par la réception
  useEffect(() => {
    if (preloadedPrescription) {
      handleLoadPrescriptionToCart(preloadedPrescription);
      setActiveTab('quick-sale');
    }
  }, [preloadedPrescription, handleLoadPrescriptionToCart]);

  const loadStock = async () => {
    try {
      let rawData: any[] | null = null;
      const { data, error } = await supabase
        .from('pharmacy_stock')
        .select('*');

      if (!error && data && data.length > 0) {
        rawData = data;
      } else {
        // Essayer de charger depuis medicaments si la table pharmacy_stock est vide
        const { data: medData } = await supabase.from('medicaments').select('*').limit(60);
        if (medData && medData.length > 0) {
          rawData = medData;
        }
      }

      if (rawData && rawData.length > 0) {
        const normalizedStock: PharmacyStockItem[] = rawData.map((m: any) => ({
          id: m.id || crypto.randomUUID(),
          medicine_name: m.medicine_name || m.denomination || m.nom || 'Médicament',
          medicine_code: m.medicine_code || m.cis || `MED-${(m.id || '').toString().slice(0, 4)}`,
          barcode: m.barcode || m.cis || '',
          category: m.category || m.categorie || 'Antalgiques / Antipyrétiques',
          laboratory: m.laboratory || m.laboratoire || 'Générique',
          supplier: m.supplier || m.fournisseur || '',
          supplier_phone: m.supplier_phone || '',
          quantity_available: Number(m.quantity_available ?? m.quantite ?? 20),
          minimum_threshold: Number(m.minimum_threshold ?? m.seuil_alerte ?? 5),
          purchase_price: Number(m.purchase_price ?? m.prix_achat ?? 0),
          sale_price: Number(m.sale_price ?? m.prix_unitaire ?? m.prix_vente ?? 0),
          lot_number: m.lot_number || m.numero_lot || '',
          entry_date: m.entry_date || new Date().toISOString().slice(0, 10),
          expiration_date: m.expiration_date || m.date_expiration || '2027-12-31',
          location: m.location || m.emplacement || 'Rayon A1',
          is_active: m.is_active !== false,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }));
        setStock(normalizedStock);
      }
    } catch {
      /* fallback silent */
    }
  };

  const loadSales = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_sales')
        .select(`
          *,
          items:pharmacy_sale_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback vers les transactions de source pharmacie
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('source', 'pharmacy')
          .order('created_at', { ascending: false });

        if (txData && txData.length > 0) {
          const mappedSales = txData.map((t: any) => ({
            id: t.id,
            reference: t.source_reference || `VTE-${t.id.slice(0, 6)}`,
            total_amount: Number(t.montant) || 0,
            final_amount: Number(t.montant) || 0,
            discount: 0,
            payment_method: t.payment_method || 'Espèces',
            sale_date: t.created_at || new Date().toISOString(),
            status: t.status || 'completed',
            created_at: t.created_at || new Date().toISOString(),
            items: [],
          }));
          setSales(mappedSales);
          return;
        }
      }
      if (data) setSales(data);
    } catch {
      /* fallback silent */
    }
  };

  const loadStockEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_stock_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) setStockEntries(data);
    } catch {
      /* fallback silent */
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, name, phone')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStock(),
        loadSales(),
        loadStockEntries(),
        loadPatients(),
      ]);
    } catch (err) {
      console.error('Error loading pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadAllData();
  }, []);

  // ─── GESTION DU PANIER & SCANNER ──────────────────────────────────────────

  const addToCart = (stockItem: PharmacyStockItem, requestedQty = 1) => {
    if (stockItem.quantity_available <= 0) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Rupture de Stock',
        description: `Le produit "${stockItem.medicine_name}" n'a plus d'exemplaires disponibles.`,
      });
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.stock_id === stockItem.id);
      if (existing) {
        const newQty = existing.quantity + requestedQty;
        if (newQty > stockItem.quantity_available) {
          setToast({
            id: Date.now().toString(),
            type: 'warning',
            title: 'Stock Maximum Atteint',
            description: `Seulement ${stockItem.quantity_available} unités disponibles en stock.`,
          });
          return prevCart;
        }
        return prevCart.map(item =>
          item.stock_id === stockItem.id
            ? {
                ...item,
                quantity: newQty,
                subtotal: Math.max(0, newQty * item.unit_price - item.discount),
              }
            : item
        );
      } else {
        const initialQty = Math.min(requestedQty, stockItem.quantity_available);
        return [
          ...prevCart,
          {
            stock_id: stockItem.id,
            medicine_name: stockItem.medicine_name,
            medicine_code: stockItem.medicine_code,
            barcode: stockItem.barcode,
            quantity: initialQty,
            available_stock: stockItem.quantity_available,
            unit_price: stockItem.sale_price,
            discount: 0,
            subtotal: stockItem.sale_price * initialQty,
          },
        ];
      }
    });
  };

  const updateCartQuantity = (stockId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.stock_id === stockId) {
            const targetItem = stock.find(s => s.id === stockId);
            const maxStock = targetItem ? targetItem.quantity_available : item.available_stock;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > maxStock) {
              setToast({
                id: Date.now().toString(),
                type: 'warning',
                title: 'Stock insuffisant',
                description: `Maximum ${maxStock} unités disponibles.`,
              });
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              subtotal: Math.max(0, newQty * item.unit_price - item.discount),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setCartItemQuantityDirect = (stockId: string, qty: number) => {
    if (isNaN(qty) || qty < 0) return;
    setCart(prevCart => {
      if (qty === 0) {
        return prevCart.filter(item => item.stock_id !== stockId);
      }
      return prevCart.map(item => {
        if (item.stock_id === stockId) {
          const targetItem = stock.find(s => s.id === stockId);
          const maxStock = targetItem ? targetItem.quantity_available : item.available_stock;
          const finalQty = Math.min(qty, maxStock);
          return {
            ...item,
            quantity: finalQty,
            subtotal: Math.max(0, finalQty * item.unit_price - item.discount),
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (stockId: string) => {
    setCart(prevCart => prevCart.filter(item => item.stock_id !== stockId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPatient(null);
    setReceivedAmount('');
    setCartDiscount(0);
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Commande Annulée',
      description: 'Le panier de vente a été réinitialisé.',
    });
  };

  // Scanner Barcode Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;

    const trimmed = scannedCode.trim().toLowerCase();
    // Rechercher par code-barres exact d'abord
    let matched = stock.find(
      s => s.is_active && s.barcode && s.barcode.toLowerCase() === trimmed
    );

    // Sinon rechercher par code médicament
    if (!matched) {
      matched = stock.find(
        s => s.is_active && s.medicine_code && s.medicine_code.toLowerCase() === trimmed
      );
    }

    // Sinon rechercher par nom exact ou partiel
    if (!matched) {
      matched = stock.find(
        s => s.is_active && s.medicine_name.toLowerCase().includes(trimmed)
      );
    }

    if (matched) {
      addToCart(matched, 1);
      setScannedCode('');
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Produit Scanné & Ajouté !',
        description: `${matched.medicine_name} (${matched.sale_price} FCFA)`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Produit Inconnu',
        description: `Aucun médicament trouvé pour le code "${scannedCode}".`,
      });
    }
  };

  // ─── CALCULS FINANCIERS DU PANIER ─────────────────────────────────────────
  const subtotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const totalDiscountAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0) + (cartDiscount || 0);
  }, [cart, cartDiscount]);

  const finalCartAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - totalDiscountAmount);
  }, [subtotalAmount, totalDiscountAmount]);

  const changeDue = useMemo(() => {
    if (receivedAmount === '' || isNaN(Number(receivedAmount))) return 0;
    return Math.max(0, Number(receivedAmount) - finalCartAmount);
  }, [receivedAmount, finalCartAmount]);

  // ─── VALIDATION DE LA VENTE ───────────────────────────────────────────────
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setToast({
        id: Date.now().toString(),
        type: 'warning',
        title: 'Panier Vide',
        description: 'Veuillez ajouter au moins un médicament au panier avant de valider la vente.',
      });
      return;
    }

    if (receivedAmount !== '' && Number(receivedAmount) < finalCartAmount && paymentMethod === 'cash') {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Montant Reçu Insuffisant',
        description: `Le montant reçu (${receivedAmount} FCFA) est inférieur au total (${finalCartAmount} FCFA).`,
      });
      return;
    }

    setIsProcessingSale(true);
    try {
      // 1. Générer la référence de vente
      let saleReference = '';
      try {
        saleReference = await generateReference('sale');
      } catch {
        saleReference = `VTE-${Date.now().toString().slice(-6)}`;
      }

      // 2. Insérer la vente principale
      const { data: userAuth } = await supabase.auth.getUser();
      const currentUserId = userAuth?.user?.id || null;

      const pName = selectedPatient
        ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || selectedPatient.name || ''}`.trim()
        : 'Client Comptoir';

      const { data: saleData, error: saleError } = await supabase
        .from('pharmacy_sales')
        .insert([
          {
            reference: saleReference,
            patient_id: selectedPatient?.id || null,
            total_amount: subtotalAmount,
            discount: totalDiscountAmount,
            final_amount: finalCartAmount,
            payment_method: paymentMethod,
            sold_by: currentUserId,
            status: 'completed',
            notes: `Vente effectuée pour ${pName}. Mode: ${paymentMethod}.`,
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      const createdSaleId = saleData.id;

      // 3. Insérer les lignes de vente
      const saleItemsPayload = cart.map(item => ({
        sale_id: createdSaleId,
        stock_id: item.stock_id,
        medicine_name: item.medicine_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
      }));

      const { error: itemsError } = await supabase
        .from('pharmacy_sale_items')
        .insert(saleItemsPayload);

      if (itemsError) throw itemsError;

      // 4. Mettre à jour le stock disponible pour chaque produit vendu
      for (const item of cart) {
        const currentStockItem = stock.find(s => s.id === item.stock_id);
        if (currentStockItem) {
          const updatedQty = Math.max(0, currentStockItem.quantity_available - item.quantity);
          await supabase
            .from('pharmacy_stock')
            .update({
              quantity_available: updatedQty,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.stock_id);

          // Enregistrer l'historique du mouvement si possible
          try {
            await supabase.from('pharmacy_stock_history').insert([
              {
                stock_id: item.stock_id,
                movement_type: 'sale',
                quantity: -item.quantity,
                previous_quantity: currentStockItem.quantity_available,
                new_quantity: updatedQty,
                reference: saleReference,
                reason: `Vente ${saleReference} - ${item.medicine_name}`,
              },
            ]);
          } catch {
            // silent fallback
          }
        }
      }

      // 5. Enregistrer la transaction en caisse
      try {
        let caisseRef = '';
        try {
          caisseRef = await generateReference('cashier');
        } catch {
          caisseRef = `CAIS-${Date.now().toString().slice(-6)}`;
        }

        await supabase.from('transactions').insert([
          {
            id: crypto.randomUUID(),
            reference: caisseRef,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            patient_id: selectedPatient?.id || null,
            type: 'revenue',
            category: 'pharmacy',
            amount: finalCartAmount,
            source: 'pharmacy',
            source_reference: saleReference,
            status: 'validated',
            notes: `Vente Pharmacie ${saleReference} (${cart.length} articles) - ${pName}`,
          },
        ]);
      } catch (caisseErr) {
        console.warn('Caisse transaction notice:', caisseErr);
      }

      // 6. Préparer le reçu pour affichage
      const preparedReceipt: ReceiptData = {
        reference: saleReference,
        number: saleReference,
        patientName: pName,
        patientId: selectedPatient?.id,
        date: new Date().toISOString(),
        items: cart.map(c => ({
          description: c.medicine_name,
          quantity: c.quantity,
          unitPrice: c.unit_price,
          discount: c.discount,
          totalPrice: c.subtotal,
        })),
        subtotal: subtotalAmount,
        discount: totalDiscountAmount,
        tax: 0,
        total: finalCartAmount,
        paidAmount: receivedAmount !== '' ? Number(receivedAmount) : finalCartAmount,
        paymentMethod: paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte Bancaire' : 'Virement',
        cashierName: 'Pharmacie Al Shifa',
        type: 'Ticket de Vente Pharmacie',
      };

      setReceiptData(preparedReceipt);
      setShowReceiptModal(true);

      // Réinitialiser le panier et recharger les données
      setCart([]);
      setSelectedPatient(null);
      setReceivedAmount('');
      setCartDiscount(0);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Vente Validée avec Succès !',
        description: `Référence ${saleReference} enregistrée. Stock et caisse mis à jour.`,
      });

      // Rafraîchir stock et ventes
      await loadStock();
      await loadSales();
    } catch (err: any) {
      console.error('Error completing sale:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur lors de la Vente',
        description: err.message || 'Impossible d\'enregistrer la vente.',
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  // ─── ANNULATION DE VENTE ──────────────────────────────────────────────────
  const handleCancelSale = async (sale: SaleRecord) => {
    if (sale.status === 'cancelled') return;
    if (!window.confirm(`Confirmer l'annulation de la vente ${sale.reference} ?\nLes articles seront remis en stock et le montant sera déduit de la caisse.`)) {
      return;
    }

    try {
      // 1. Mettre à jour le statut de la vente
      const { error: updateError } = await supabase
        .from('pharmacy_sales')
        .update({
          status: 'cancelled',
          refund_to_stock: true,
          notes: `${sale.notes || ''} [ANNULÉE le ${new Date().toLocaleString('fr-FR')}]`,
        })
        .eq('id', sale.id);

      if (updateError) throw updateError;

      // 2. Remettre les articles au stock
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const stItem = stock.find(s => s.id === item.stock_id);
          if (stItem) {
            const restoredQty = stItem.quantity_available + Number(item.quantity);
            await supabase
              .from('pharmacy_stock')
              .update({
                quantity_available: restoredQty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.stock_id);

            // Tracer le mouvement
            try {
              await supabase.from('pharmacy_stock_history').insert([
                {
                  stock_id: item.stock_id,
                  movement_type: 'cancellation',
                  quantity: item.quantity,
                  previous_quantity: stItem.quantity_available,
                  new_quantity: restoredQty,
                  reference: sale.reference,
                  reason: `Annulation Vente ${sale.reference}`,
                },
              ]);
            } catch {
              /* silent */
            }
          }
        }
      }

      // 3. Écrire une transaction négative d'annulation en caisse
      try {
        let cancelRef = '';
        try {
          cancelRef = await generateReference('refund');
        } catch {
          cancelRef = `ANN-${Date.now().toString().slice(-6)}`;
        }

        await supabase.from('transactions').insert([
          {
            id: crypto.randomUUID(),
            reference: cancelRef,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            patient_id: sale.patient_id,
            type: 'cancellation',
            category: 'pharmacy',
            amount: -Math.abs(sale.final_amount),
            source: 'pharmacy',
            source_reference: sale.reference,
            status: 'validated',
            notes: `Annulation Vente Pharmacie ${sale.reference} - Stock réintégré`,
          },
        ]);
      } catch (tErr) {
        console.warn('Transaction error:', tErr);
      }

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Vente Annulée',
        description: `La vente ${sale.reference} a été annulée. Stock restauré et caisse ajustée.`,
      });

      await loadStock();
      await loadSales();
    } catch (err: any) {
      console.error('Error cancelling sale:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur d\'Annulation',
        description: err.message,
      });
    }
  };

  // ─── REMBOURSEMENT DE VENTE ───────────────────────────────────────────────
  const handleOpenRefundModal = (sale: SaleRecord) => {
    setSaleToRefund(sale);
    setRefundToStock(true);
    setRefundReason('Retour médicament non utilisé');
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund) return;
    setIsProcessingRefund(true);

    try {
      // 1. Mettre à jour le statut de la vente
      const { error: saleUpError } = await supabase
        .from('pharmacy_sales')
        .update({
          status: 'refunded',
          refund_to_stock: refundToStock,
          notes: `${saleToRefund.notes || ''} [REMBOURSÉ : ${refundReason} - Stock: ${refundToStock ? 'Réintégré' : 'Non réintégré'}]`,
        })
        .eq('id', saleToRefund.id);

      if (saleUpError) throw saleUpError;

      // 2. Si l'option retour au stock est activée, réincrémenter le stock
      if (refundToStock && saleToRefund.items && saleToRefund.items.length > 0) {
        for (const item of saleToRefund.items) {
          const stItem = stock.find(s => s.id === item.stock_id);
          if (stItem) {
            const restoredQty = stItem.quantity_available + Number(item.quantity);
            await supabase
              .from('pharmacy_stock')
              .update({
                quantity_available: restoredQty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.stock_id);

            try {
              await supabase.from('pharmacy_stock_history').insert([
                {
                  stock_id: item.stock_id,
                  movement_type: 'refund',
                  quantity: item.quantity,
                  previous_quantity: stItem.quantity_available,
                  new_quantity: restoredQty,
                  reference: saleToRefund.reference,
                  reason: `Remboursement Vente ${saleToRefund.reference} - ${refundReason}`,
                },
              ]);
            } catch {
              /* silent */
            }
          }
        }
      }

      // 3. Créer une transaction négative de remboursement en caisse
      try {
        let refundRef = '';
        try {
          refundRef = await generateReference('refund');
        } catch {
          refundRef = `REM-${Date.now().toString().slice(-6)}`;
        }

        await supabase.from('transactions').insert([
          {
            id: crypto.randomUUID(),
            reference: refundRef,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            patient_id: saleToRefund.patient_id,
            type: 'refund',
            category: 'pharmacy',
            amount: -Math.abs(saleToRefund.final_amount),
            source: 'refund',
            source_reference: saleToRefund.reference,
            status: 'validated',
            notes: `Remboursement Vente Pharmacie ${saleToRefund.reference} (${refundReason}) - Stock ${refundToStock ? 'Restauré' : 'Non remis'}`,
          },
        ]);
      } catch (tErr) {
        console.warn('Transaction error:', tErr);
      }

      setShowRefundModal(false);
      setSaleToRefund(null);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Vente Remboursée',
        description: `Vente ${saleToRefund.reference} remboursée (${saleToRefund.final_amount} FCFA). Stock ${refundToStock ? 'réintégré' : 'conservé'}.`,
      });

      await loadStock();
      await loadSales();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur lors du Remboursement',
        description: err.message,
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // ─── AUTOCOMPLÉTION & RECHERCHE DE MÉDICAMENT ────────────────────────────
  const handleMedicineNameChange = async (nameVal: string) => {
    setNewMedicineForm(prev => ({ ...prev, medicine_name: nameVal }));
    const trimmed = nameVal.trim().toLowerCase();

    if (!trimmed || trimmed.length < 2) {
      setMedSuggestions([]);
      setShowMedSuggestions(false);
      setMatchingStockFound(null);
      return;
    }

    // 1. Chercher dans le stock existant
    const stockMatches = stock.filter(s =>
      s.medicine_name.toLowerCase().includes(trimmed) ||
      (s.medicine_code && s.medicine_code.toLowerCase().includes(trimmed)) ||
      (s.barcode && s.barcode.toLowerCase().includes(trimmed))
    );

    const exactInStock = stock.find(s => s.medicine_name.toLowerCase() === trimmed);
    setMatchingStockFound(exactInStock || null);

    // 2. Chercher dans le catalogue 'medicaments'
    let catalogMatches: any[] = [];
    try {
      const { data } = await supabase
        .from('medicaments')
        .select('*')
        .ilike('denomination', `%${trimmed}%`)
        .limit(5);
      if (data) catalogMatches = data;
    } catch { /* silent */ }

    const combined = [
      ...stockMatches.map(s => ({ ...s, _source: 'stock' })),
      ...catalogMatches.map(c => ({
        id: c.id,
        medicine_name: c.denomination || c.nom,
        laboratory: c.laboratoire || 'Générique',
        medicine_code: c.cis || '',
        _source: 'catalog',
      })),
    ].slice(0, 8);

    setMedSuggestions(combined);
    setShowMedSuggestions(combined.length > 0);
  };

  const handleSelectMedSuggestion = (item: any) => {
    const isFromStock = item._source === 'stock' || item.quantity_available !== undefined;
    const name = item.medicine_name || item.denomination || item.nom || '';

    if (isFromStock) {
      const existing = stock.find(s => s.id === item.id) || item;
      setEditingStockItem(existing);
      setNewMedicineForm({
        ...existing,
        medicine_name: name,
      });
      setMatchingStockFound(existing);
    } else {
      const stockMatch = stock.find(s => s.medicine_name.toLowerCase() === name.toLowerCase());
      if (stockMatch) {
        setEditingStockItem(stockMatch);
        setNewMedicineForm({
          ...stockMatch,
          medicine_name: name,
        });
        setMatchingStockFound(stockMatch);
      } else {
        setEditingStockItem(null);
        setNewMedicineForm(prev => ({
          ...prev,
          medicine_name: name,
          laboratory: item.laboratory || item.laboratoire || '',
          medicine_code: item.medicine_code || item.cis || `MED-${Math.floor(100 + Math.random() * 900)}`,
        }));
        setMatchingStockFound(null);
      }
    }
    setShowMedSuggestions(false);
  };

  // ─── IMPRESSION & EXPORT DU RAPPORT DE VENTES ─────────────────────────────
  const handlePrintSalesReport = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const clinicSettings = getClinicSettings();
    const completedList = sales.filter(s => s.status === 'completed');
    const totalAmount = completedList.reduce((sum, s) => sum + (s.final_amount || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Journal des Ventes Pharmacie - ${new Date().toLocaleDateString('fr-FR')}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 12px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; }
          .subtitle { font-size: 12px; color: #64748b; margin: 4px 0; font-weight: 600; }
          .kpi-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .kpi { text-align: center; }
          .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800; }
          .kpi-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          td { border: 1px solid #e2e8f0; padding: 7px 8px; font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${clinicSettings.clinicName || 'CLINIQUE AL SHIFA'} - PHARMACIE</div>
          <div class="subtitle">Journal & Rapport d'Activité des Ventes Comptoir</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Date du rapport : ${new Date().toLocaleString('fr-FR')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-label">Nombre de Ventes</div>
            <div class="kpi-val">${completedList.length}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Total Encaissé</div>
            <div class="kpi-val" style="color: #059669;">${totalAmount.toLocaleString()} FCFA</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Articles en Inventaire</div>
            <div class="kpi-val">${stock.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Réf. Vente</th>
              <th>Date & Heure</th>
              <th>Mode Règlement</th>
              <th class="text-center">Statut</th>
              <th class="text-right">Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            ${sales.slice(0, 100).map(s => `
              <tr>
                <td><strong>${s.reference}</strong></td>
                <td>${s.created_at ? new Date(s.created_at).toLocaleString('fr-FR') : '-'}</td>
                <td>${s.payment_method || 'Espèces'}</td>
                <td class="text-center">
                  <span style="font-weight: bold; color: ${s.status === 'completed' ? '#059669' : '#dc2626'}">
                    ${s.status === 'completed' ? 'Validé' : s.status === 'refunded' ? 'Remboursé' : 'Annulé'}
                  </span>
                </td>
                <td class="text-right"><strong>${(s.final_amount || 0).toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Clinique Al Shifa · Rapport Certifié Conforme · Système de Gestion Intégré
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── GESTION CRÉATION & MODIFICATION DE MÉDICAMENT ────────────────────────
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedicineForm.medicine_name?.trim()) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Nom requis',
        description: 'Veuillez saisir le nom du médicament.',
      });
      return;
    }

    const medName = newMedicineForm.medicine_name.trim();
    const qty = Number(newMedicineForm.quantity_available) || 0;
    const threshold = Number(newMedicineForm.minimum_threshold) || 5;
    const pPrice = Number(newMedicineForm.purchase_price) || 0;
    const sPrice = Number(newMedicineForm.sale_price) || 0;

    const payload: any = {
      medicine_name: medName,
      nom: medName,
      denomination: medName,
      medicine_code: newMedicineForm.medicine_code || `MED-${Math.floor(100 + Math.random() * 900)}`,
      barcode: newMedicineForm.barcode || '',
      category: newMedicineForm.category || 'Antalgiques / Antipyrétiques',
      laboratory: newMedicineForm.laboratory || '',
      supplier: newMedicineForm.supplier || '',
      supplier_phone: newMedicineForm.supplier_phone || '',
      quantity_available: qty,
      quantite: qty,
      minimum_threshold: threshold,
      seuil_alerte: threshold,
      purchase_price: pPrice,
      prix_achat: pPrice,
      sale_price: sPrice,
      prix_unitaire: sPrice,
      lot_number: newMedicineForm.lot_number || '',
      entry_date: newMedicineForm.entry_date || new Date().toISOString().slice(0, 10),
      expiration_date: newMedicineForm.expiration_date || null,
      date_expiration: newMedicineForm.expiration_date || null,
      location: newMedicineForm.location || 'Rayon A1',
      is_active: newMedicineForm.is_active !== false,
    };

    try {
      if (editingStockItem) {
        // Mise à jour
        const { error } = await supabase
          .from('pharmacy_stock')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStockItem.id);

        if (error) {
          // Essai minimal avec fallback 'nom' ou 'medicine_name'
          await supabase
            .from('pharmacy_stock')
            .update({
              nom: medName,
              medicine_name: medName,
              prix_unitaire: sPrice,
              sale_price: sPrice,
              prix_achat: pPrice,
              purchase_price: pPrice,
              quantite: qty,
              quantity_available: qty,
            })
            .eq('id', editingStockItem.id);
        }

        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Médicament Mis à Jour',
          description: `${medName} (${sPrice.toLocaleString()} FCFA) a été mis à jour avec succès.`,
        });
      } else {
        // Création
        const { error } = await supabase
          .from('pharmacy_stock')
          .insert([{ id: crypto.randomUUID(), ...payload }]);

        if (error) {
          // Essai avec colonnes simplifiées
          const { error: minErr } = await supabase.from('pharmacy_stock').insert([{
            id: crypto.randomUUID(),
            nom: medName,
            quantite: qty,
            prix_unitaire: sPrice,
            prix_achat: pPrice,
          }]);
          if (minErr) {
            await supabase.from('pharmacy_stock').insert([{
              id: crypto.randomUUID(),
              medicine_name: medName,
              quantity_available: qty,
              sale_price: sPrice,
              purchase_price: pPrice,
            }]);
          }
        }

        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Nouveau Médicament Ajouté',
          description: `${medName} (${sPrice.toLocaleString()} FCFA) a été enregistré dans le stock.`,
        });
      }

      setShowNewStockModal(false);
      setEditingStockItem(null);
      setMatchingStockFound(null);
      setNewMedicineForm({
        medicine_name: '',
        medicine_code: '',
        barcode: '',
        category: 'Antalgiques / Antipyrétiques',
        laboratory: '',
        supplier: '',
        supplier_phone: '',
        quantity_available: 10,
        minimum_threshold: 5,
        purchase_price: 0,
        sale_price: 0,
        lot_number: '',
        entry_date: new Date().toISOString().slice(0, 10),
        expiration_date: '',
        location: 'Rayon A1',
        is_active: true,
      });

      await loadStock();
    } catch (err: any) {
      console.error('Error saving medicine:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur Enregistrement',
        description: err.message || 'Impossible d\'enregistrer le produit.',
      });
    }
  };

  // ─── GESTION ENTRÉE DE STOCK ──────────────────────────────────────────────
  const handleSaveStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForEntry) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Sélection Requise',
        description: 'Veuillez sélectionner un médicament pour l\'entrée de stock.',
      });
      return;
    }

    try {
      let entryRef = '';
      try {
        entryRef = await generateReference('stock_entry');
      } catch {
        entryRef = `ENT-${Date.now().toString().slice(-6)}`;
      }

      const { data: userAuth } = await supabase.auth.getUser();

      // 1. Créer l'entrée
      const { error: entryError } = await supabase.from('pharmacy_stock_entries').insert([
        {
          reference: entryRef,
          stock_id: selectedStockForEntry.id,
          supplier: stockEntryForm.supplier || selectedStockForEntry.supplier || 'Fournisseur Principal',
          quantity: Number(stockEntryForm.quantity),
          purchase_price: Number(stockEntryForm.purchase_price) || selectedStockForEntry.purchase_price,
          lot_number: stockEntryForm.lot_number || selectedStockForEntry.lot_number,
          expiration_date: stockEntryForm.expiration_date || selectedStockForEntry.expiration_date || null,
          entry_date: new Date().toISOString().split('T')[0],
          notes: stockEntryForm.notes,
          user_id: userAuth?.user?.id || null,
        },
      ]);

      if (entryError) throw entryError;

      // 2. Incrémenter le stock
      const newQty = selectedStockForEntry.quantity_available + Number(stockEntryForm.quantity);
      const { error: stockUpError } = await supabase
        .from('pharmacy_stock')
        .update({
          quantity_available: newQty,
          lot_number: stockEntryForm.lot_number || selectedStockForEntry.lot_number,
          expiration_date: stockEntryForm.expiration_date || selectedStockForEntry.expiration_date,
          purchase_price: Number(stockEntryForm.purchase_price) || selectedStockForEntry.purchase_price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedStockForEntry.id);

      if (stockUpError) throw stockUpError;

      // 3. Tracer l'historique
      try {
        await supabase.from('pharmacy_stock_history').insert([
          {
            stock_id: selectedStockForEntry.id,
            movement_type: 'entry',
            quantity: Number(stockEntryForm.quantity),
            previous_quantity: selectedStockForEntry.quantity_available,
            new_quantity: newQty,
            reference: entryRef,
            reason: `Approvisionnement ${entryRef} - ${stockEntryForm.supplier}`,
          },
        ]);
      } catch {
        /* silent */
      }

      setShowStockEntryModal(false);
      setSelectedStockForEntry(null);
      setStockEntryForm({
        supplier: '',
        quantity: 10,
        purchase_price: 0,
        lot_number: '',
        expiration_date: '',
        notes: '',
      });

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Entrée de Stock Validée !',
        description: `+${stockEntryForm.quantity} unités ajoutées à ${selectedStockForEntry.medicine_name}.`,
      });

      await loadStock();
      await loadStockEntries();
    } catch (err: any) {
      console.error('Error saving stock entry:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur Entrée de Stock',
        description: err.message,
      });
    }
  };

  // ─── STATISTIQUES & CAISSE DU JOUR ────────────────────────────────────────
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaySales = useMemo(() => {
    return sales.filter(s => s.created_at && s.created_at.startsWith(todayStr));
  }, [sales, todayStr]);

  const todayCompletedSales = useMemo(() => {
    return todaySales.filter(s => s.status === 'completed');
  }, [todaySales]);

  const todayRefundedSales = useMemo(() => {
    return todaySales.filter(s => s.status === 'refunded' || s.status === 'cancelled');
  }, [todaySales]);

  const todayGrossTotal = useMemo(() => {
    return todayCompletedSales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);
  }, [todayCompletedSales]);

  const todayRefundTotal = useMemo(() => {
    return todayRefundedSales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);
  }, [todayRefundedSales]);

  const todayNetCash = useMemo(() => {
    return Math.max(0, todayGrossTotal - todayRefundTotal);
  }, [todayGrossTotal, todayRefundTotal]);

  // Alertes de stock
  const lowStockItems = useMemo(() => {
    return stock.filter(s => s.is_active && s.quantity_available > 0 && s.quantity_available <= s.minimum_threshold);
  }, [stock]);

  const outOfStockItems = useMemo(() => {
    return stock.filter(s => s.is_active && s.quantity_available <= 0);
  }, [stock]);

  const expiringSoonItems = useMemo(() => {
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    return stock.filter(s => {
      if (!s.expiration_date) return false;
      const expDate = new Date(s.expiration_date);
      return expDate <= next30Days;
    });
  }, [stock]);

  // Filtrage du stock
  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      if (!item.is_active) return false;
      const matchesSearch =
        !searchQuery ||
        item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.medicine_code && item.medicine_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.barcode && item.barcode.includes(searchQuery));

      const matchesCat = selectedCategory === 'Tous' || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [stock, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* HEADER PHARMACIE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Pharmacie &amp; Stocks Intégrés</h1>
              <p className="text-xs text-slate-500 font-medium">
                Ventes rapides au scanner, gestion des stocks, caisse du jour et délivrance d'ordonnances
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingStockItem(null);
              setShowNewStockModal(true);
            }}
            className="text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nouveau Produit
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedStockForEntry(null);
              setShowStockEntryModal(true);
            }}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 mr-1" />
            Entrée Stock
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => loadAllData()}
            disabled={loading}
            className="text-xs font-semibold"
            title="Rafraîchir les données"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* BARRE DE NAVIGATION DES ONGLETS */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-0.5 scrollbar-thin">
        {[
          { id: 'quick-sale', label: t('pharmacy.tab.quick_sale', '🛒 Comptoir de Vente'), count: cart.length > 0 ? `${cart.length}` : null },
          { id: 'caisse', label: t('pharmacy.tab.caisse', '💰 Caisse Pharmacie'), badge: `${todayNetCash.toLocaleString()} FCFA` },
          { id: 'stock', label: t('pharmacy.tab.stock', '📦 Gestion du Stock'), count: `${stock.length}` },
          { id: 'stock-entries', label: t('pharmacy.tab.stock_entries', '🚚 Entrées & Livraisons') },
          {
            id: 'alerts',
            label: t('pharmacy.tab.alerts', '⚠️ Alertes & Péremptions'),
            alertCount: lowStockItems.length + outOfStockItems.length + expiringSoonItems.length,
          },
          { id: 'history', label: t('pharmacy.tab.history', '📜 Historique Ventes') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PharmacyTab)}
            className={cn(
              'px-4 py-3 font-bold text-xs transition-all border-b-2 -mb-px whitespace-nowrap flex items-center gap-2 rounded-t-xl',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            <span>{tab.label}</span>
            {tab.count && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                {tab.badge}
              </span>
            )}
            {tab.alertCount && tab.alertCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {tab.alertCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET : COMPTOIR DE VENTE & SCANNER (QUICK SALE)                      */}
      {/* ========================================================================= */}
      {activeTab === 'quick-sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SECTION GAUCHE (7/12) : SCANNER + CATALOGUE DU STOCK */}
          <div className="lg:col-span-7 space-y-4">
            {/* SCANNER DE CODE-BARRES RAPIDE */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <CardContent className="p-4 sm:p-5">
                <form onSubmit={handleBarcodeSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-teal-400" />
                      Scanner de Code-Barres / Saisie Directe
                    </label>
                    <span className="text-[11px] text-teal-300 font-medium bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800/60">
                      Entrée pour ajouter direct ⚡
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scannez ou tapez le code-barres, code produit ou nom..."
                      value={scannedCode}
                      onChange={e => setScannedCode(e.target.value)}
                      className="w-full pl-11 pr-24 py-3.5 bg-white/10 border-2 border-indigo-500/40 rounded-xl text-white placeholder-indigo-300/60 text-sm font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-400/20 transition-all"
                    />
                    <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300" />
                    <Button
                      type="submit"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs px-3 shadow-sm"
                    >
                      Ajouter
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* RECHERCHE & FILTRES CATÉGORIES */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Filtrer les médicaments du stock..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 text-xs font-semibold py-2.5"
                    />
                  </div>
                </div>

                {/* Badges catégories */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {MEDICINE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all',
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* GRILLE DU STOCK CLICABLE */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredStock.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6">
                  <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Aucun médicament trouvé</p>
                  <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-clé ou ajoutez un nouveau produit.</p>
                </div>
              ) : (
                filteredStock.map(item => {
                  const isOutOfStock = item.quantity_available <= 0;
                  const isLow = item.quantity_available > 0 && item.quantity_available <= item.minimum_threshold;
                  const cartItem = cart.find(c => c.stock_id === item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={cn(
                        'p-3.5 rounded-2xl bg-white border transition-all flex items-center justify-between gap-3 text-xs select-none',
                        isOutOfStock
                          ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : 'hover:border-blue-400 hover:shadow-md cursor-pointer border-slate-200/90'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs',
                            isOutOfStock
                              ? 'bg-slate-400'
                              : isLow
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          )}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-slate-800 text-sm truncate">{item.medicine_name}</p>
                            {cartItem && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                                {cartItem.quantity} au panier
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.medicine_code ? `Code: ${item.medicine_code}` : ''}
                            {item.barcode ? ` · Réf: ${item.barcode}` : ''}
                            {item.category ? ` · ${item.category}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px]">
                            <span
                              className={cn(
                                'font-bold',
                                isOutOfStock ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                              )}
                            >
                              Stock : {item.quantity_available} boîte(s)
                            </span>
                            {item.expiration_date && (
                              <span className="text-slate-400">
                                Exp : {new Date(item.expiration_date).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-base font-black text-blue-700">{item.sale_price} FCFA</p>
                          <p className="text-[10px] text-slate-400">TTC</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={isOutOfStock}
                          className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold p-2 h-9 w-9 rounded-xl transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION DROITE (5/12) : PANIER & VALIDATION DE LA VENTE */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-0 shadow-md bg-white sticky top-4">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-extrabold">Panier de Vente</CardTitle>
                    {cart.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                        {cart.length} item{cart.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-xs text-rose-600 hover:bg-rose-50 font-bold h-8 px-2"
                      title="Annuler et vider la commande"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Vider le panier
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* SÉLECTION DU PATIENT (OPTIONNEL) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Patient / Client (Optionnel)
                  </label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedPatient?.id || ''}
                    onChange={e => {
                      const p = patients.find(pat => pat.id === e.target.value);
                      setSelectedPatient(p || null);
                    }}
                  >
                    <option value="">-- Client Comptoir (Vente Anonyme) --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name || p.name} (Tél: {p.phone || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* LISTE DES ARTICLES DU PANIER */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 p-4">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">Le panier est vide</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Scannez un code-barres ou cliquez sur un produit à gauche.
                      </p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div
                        key={item.stock_id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{item.medicine_name}</p>
                            <p className="text-[11px] text-slate-500">{item.unit_price} FCFA / unité</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.stock_id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 p-1 rounded-lg transition-colors"
                            title="Supprimer cet article"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          {/* Contrôle de quantité */}
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.stock_id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.available_stock}
                              value={item.quantity}
                              onChange={e =>
                                setCartItemQuantityDirect(item.stock_id, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-10 text-center font-extrabold text-slate-800 text-xs outline-none bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.stock_id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>

                          {/* Sous-total item */}
                          <div className="text-right">
                            <span className="font-black text-sm text-blue-700">{item.subtotal} FCFA</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* MODES DE PAIEMENT & ENCAISSEMENT */}
                {cart.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    {/* Mode de paiement */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Mode de Règlement
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'cash', label: 'Espèces', icon: <DollarSign className="w-3.5 h-3.5" /> },
                          { id: 'card', label: 'Carte Banc.', icon: <CreditCard className="w-3.5 h-3.5" /> },
                          { id: 'transfer', label: 'Virement', icon: <ReceiptIcon className="w-3.5 h-3.5" /> },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={cn(
                              'py-2 px-1.5 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all',
                              paymentMethod === m.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            {m.icon}
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Montant Reçu & Monnaie à rendre si espèces */}
                    {paymentMethod === 'cash' && (
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Montant Reçu</label>
                          <div className="relative mt-0.5">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder={finalCartAmount.toString()}
                              value={receivedAmount}
                              onChange={e => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-black text-slate-800 bg-white outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Monnaie à Rendre</label>
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-black text-emerald-700 mt-0.5 text-right">
                            {changeDue} FCFA
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Récapitulatif */}
                    <div className="space-y-1 bg-gradient-to-br from-slate-900 to-indigo-950 p-4 rounded-2xl text-white shadow-md">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Sous-total articles</span>
                        <span className="font-semibold">{subtotalAmount} FCFA</span>
                      </div>
                      {totalDiscountAmount > 0 && (
                        <div className="flex justify-between text-xs text-rose-300">
                          <span>Remises</span>
                          <span className="font-semibold">-{totalDiscountAmount} FCFA</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-indigo-800/80">
                        <span className="font-extrabold text-sm text-indigo-200">TOTAL À PAYER</span>
                        <span className="text-xl font-black text-teal-400">{finalCartAmount} FCFA</span>
                      </div>
                    </div>

                    {/* Bouton de validation de la vente */}
                    <Button
                      onClick={handleCompleteSale}
                      disabled={isProcessingSale || cart.length === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessingSale ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Validation de la vente...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Valider la Vente ({finalCartAmount} FCFA)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET : CAISSE PHARMACIE & BILAN DU JOUR                              */}
      {/* ========================================================================= */}
      {activeTab === 'caisse' && (
        <div className="space-y-6">
          {/* KPI CARDS DU JOUR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ventes Brutes du Jour</p>
                    <p className="text-2xl font-black text-emerald-950 mt-1">{todayGrossTotal.toLocaleString()} FCFA</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      {todayCompletedSales.length} transaction(s) validée(s)
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Remboursements / Annulés</p>
                    <p className="text-2xl font-black text-rose-950 mt-1">{todayRefundTotal.toLocaleString()} FCFA</p>
                    <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                      {todayRefundedSales.length} retour(s) enregistré(s)
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Net en Caisse Aujourd'hui</p>
                    <p className="text-2xl font-black text-blue-950 mt-1">{todayNetCash.toLocaleString()} FCFA</p>
                    <p className="text-[11px] text-blue-700 font-semibold mt-0.5">Total disponible</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Volume Total Ventes</p>
                    <p className="text-2xl font-black text-indigo-950 mt-1">{sales.length}</p>
                    <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">Historique global</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <History className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLEAU DES VENTES DU JOUR */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-2">
              <div>
                <CardTitle className="text-base font-black">Journal de Caisse Pharmacie — Aujourd'hui</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Détail de tous les encaissements, annulations et remboursements de la journée
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintSalesReport}
                  className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  Imprimer le Journal / Rapport
                </Button>
                <Button size="sm" onClick={() => setActiveTab('quick-sale')} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nouvelle Vente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todaySales.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Aucune vente enregistrée aujourd'hui pour l'instant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                        <th className="p-3">Réf Vente</th>
                        <th className="p-3">Heure</th>
                        <th className="p-3">Client / Patient</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3 text-center">Statut</th>
                        <th className="p-3 text-center">Retour Stock</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todaySales.map(s => {
                        const isCompleted = s.status === 'completed';
                        const isCancelled = s.status === 'cancelled';
                        const isRefunded = s.status === 'refunded';

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{s.reference}</td>
                            <td className="p-3 text-slate-500">
                              {new Date(s.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              {s.patient_id
                                ? (() => {
                                    const p = patients.find(x => x.id === s.patient_id);
                                    return p ? (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || 'Patient Enregistré')) : 'Patient Enregistré';
                                  })()
                                : 'Client Comptoir'}
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {s.payment_method}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-sm text-slate-900">
                              {s.final_amount} FCFA
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-black',
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isCancelled
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-rose-100 text-rose-800'
                                )}
                              >
                                {isCompleted ? 'Validé' : isCancelled ? 'Annulé' : 'Remboursé'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {isRefunded || isCancelled ? (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded',
                                    s.refund_to_stock ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                                  )}
                                >
                                  {s.refund_to_stock ? '✅ Remis au stock' : '❌ Non réintégré'}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReceiptData({
                                      reference: s.reference,
                                      number: s.reference,
                                      patientName: s.patient_id
                                        ? (() => {
                                            const p = patients.find(x => x.id === s.patient_id);
                                            return p ? (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || 'Patient')) : 'Patient';
                                          })()
                                        : 'Client Comptoir',
                                      date: s.created_at,
                                      items: s.items?.map(it => ({
                                        description: it.medicine_name,
                                        quantity: it.quantity,
                                        unitPrice: it.unit_price,
                                        totalPrice: it.subtotal,
                                      })) || [],
                                      subtotal: s.total_amount,
                                      discount: s.discount,
                                      total: s.final_amount,
                                      paidAmount: s.final_amount,
                                      paymentMethod: s.payment_method,
                                      cashierName: 'Pharmacie Al Shifa',
                                    });
                                    setShowReceiptModal(true);
                                  }}
                                  className="text-xs p-1.5 h-7 text-blue-600 hover:bg-blue-50"
                                  title="Voir le reçu"
                                >
                                  <ReceiptIcon className="w-3.5 h-3.5" />
                                </Button>

                                {isCompleted && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenRefundModal(s)}
                                      className="text-xs p-1.5 h-7 text-amber-600 hover:bg-amber-50"
                                      title="Rembourser"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCancelSale(s)}
                                      className="text-xs p-1.5 h-7 text-rose-600 hover:bg-rose-50"
                                      title="Annuler la vente"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET : GESTION DU STOCK                                              */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-black">Inventaire Général du Stock Pharmacie</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {stock.length} médicament(s) et produits référencés dans la base
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditingStockItem(null);
                  setShowNewStockModal(true);
                }}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Ajouter Médicament
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, code produit, code-barres ou catégorie..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 text-xs font-semibold"
              />
            </div>

            {/* Tableau du stock */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                    <th className="p-3">Médicament</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Emplacement</th>
                    <th className="p-3">Lot &amp; Péremption</th>
                    <th className="p-3 text-center">Quantité</th>
                    <th className="p-3 text-right">Prix Achat</th>
                    <th className="p-3 text-right">Prix Vente</th>
                    <th className="p-3 text-center">Disponibilité</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStock.map(item => {
                    const isOut = item.quantity_available <= 0;
                    const isLow = item.quantity_available > 0 && item.quantity_available <= item.minimum_threshold;
                    const isAvailable = item.is_active !== false;

                    return (
                      <tr key={item.id} className={cn('hover:bg-slate-50/80 transition-colors', !isAvailable && 'opacity-60 bg-slate-50/40')}>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800 text-sm">{item.medicine_name}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.medicine_code || item.barcode || 'Sans code'} · {item.laboratory || 'Générique'}
                          </p>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{item.category || 'Général'}</td>
                        <td className="p-3 text-slate-600 font-medium">{item.location || 'Rayon A'}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-700">Lot: {item.lot_number || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400">
                            Exp: {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full font-black text-xs',
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {item.quantity_available} {isOut ? '(Rupture)' : isLow ? '(Faible)' : ''}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-semibold font-mono">{(item.purchase_price || 0).toLocaleString()} FCFA</td>
                        <td className="p-3 text-right font-black text-blue-700 text-sm font-mono">{(item.sale_price || 0).toLocaleString()} FCFA</td>
                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                              isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            )}
                          >
                            {isAvailable ? '✅ Dispo' : '⏸️ Indisponible'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedStockForEntry(item);
                                setStockEntryForm(prev => ({
                                  ...prev,
                                  purchase_price: item.purchase_price,
                                  supplier: item.supplier || '',
                                }));
                                setShowStockEntryModal(true);
                              }}
                              className="text-xs p-1.5 h-7 text-indigo-600 hover:bg-indigo-50"
                              title="Réapprovisionner Stock"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingStockItem(item);
                                setNewMedicineForm(item);
                                setShowNewStockModal(true);
                              }}
                              className="text-xs px-2.5 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 rounded-lg"
                              title="Modifier Prix, Stock & Statut"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Modifier
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET : ENTRÉES DE STOCK & APPROVISIONNEMENT                           */}
      {/* ========================================================================= */}
      {activeTab === 'stock-entries' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-black">Historique des Entrées &amp; Réceptions Stock</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Journal des livraisons fournisseurs et réapprovisionnements
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedStockForEntry(null);
                setShowStockEntryModal(true);
              }}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouvelle Entrée Stock
            </Button>
          </CardHeader>
          <CardContent>
            {stockEntries.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Aucune entrée de stock enregistrée pour l'instant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="p-3">Réf Entrée</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Médicament</th>
                      <th className="p-3">Fournisseur</th>
                      <th className="p-3">N° Lot</th>
                      <th className="p-3">Péremption</th>
                      <th className="p-3 text-center">Quantité Reçue</th>
                      <th className="p-3 text-right">Prix Achat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockEntries.map(entry => {
                      const st = stock.find(s => s.id === entry.stock_id);
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-800">{entry.reference}</td>
                          <td className="p-3 text-slate-500">
                            {new Date(entry.entry_date || entry.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="p-3 font-extrabold text-blue-700">
                            {st?.medicine_name || entry.medicine_name || 'Médicament'}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{entry.supplier || 'Fournisseur'}</td>
                          <td className="p-3 text-slate-600">{entry.lot_number || 'N/A'}</td>
                          <td className="p-3 text-slate-500">
                            {entry.expiration_date ? new Date(entry.expiration_date).toLocaleDateString('fr-FR') : 'N/A'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-indigo-100 text-indigo-800">
                              +{entry.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">{entry.purchase_price} FCFA</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. ONGLET : ALERTES STOCK & PÉREMPTIONS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 1 : RUPTURES ET STOCKS FAIBLES */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertes Ruptures &amp; Stocks Faibles ({outOfStockItems.length + lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {[...outOfStockItems, ...lowStockItems].length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  Aucune alerte de rupture. Tous les stocks sont au-dessus du seuil.
                </div>
              ) : (
                [...outOfStockItems, ...lowStockItems].map(item => {
                  const isOut = item.quantity_available <= 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs',
                        isOut ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                      )}
                    >
                      <div>
                        <p className="font-extrabold text-slate-800">{item.medicine_name}</p>
                        <p className="text-[11px] text-slate-500">
                          Stock actuel : <strong className="text-rose-700">{item.quantity_available}</strong> (Seuil
                          min: {item.minimum_threshold})
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedStockForEntry(item);
                          setShowStockEntryModal(true);
                        }}
                        className="text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Commander
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* SECTION 2 : PÉREMPTIONS IMMINENTES */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-rose-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Médicaments Périmés ou Expirant Sous 30 Jours ({expiringSoonItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {expiringSoonItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  Aucun médicament proche de la date d'expiration.
                </div>
              ) : (
                expiringSoonItems.map(item => {
                  const isExpired = new Date(item.expiration_date!) <= new Date();
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs',
                        isExpired ? 'bg-rose-100/70 border-rose-300' : 'bg-orange-50 border-orange-200'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-800">{item.medicine_name}</p>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-black',
                              isExpired ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'
                            )}
                          >
                            {isExpired ? 'PÉRIMÉ' : 'Exp. Proche'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Date : <strong>{new Date(item.expiration_date!).toLocaleDateString('fr-FR')}</strong> · Lot :{' '}
                          {item.lot_number || 'N/A'}
                        </p>
                      </div>
                      <span className="font-black text-xs text-slate-700">{item.quantity_available} unités</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ONGLET : HISTORIQUE COMPLET DES VENTES                                 */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-black">Historique Général des Ventes Pharmacie</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez, réimprimez ou remboursez n'importe quelle vente passée
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Aucune vente enregistrée dans l'historique.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="p-3">Réf</th>
                      <th className="p-3">Date &amp; Heure</th>
                      <th className="p-3">Patient / Client</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3 text-right">Total Payé</th>
                      <th className="p-3 text-center">Statut</th>
                      <th className="p-3 text-center">Retour Stock</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map(s => {
                      const isCompleted = s.status === 'completed';
                      const isCancelled = s.status === 'cancelled';
                      const isRefunded = s.status === 'refunded';

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-800">{s.reference}</td>
                          <td className="p-3 text-slate-500">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                          <td className="p-3 font-semibold text-slate-700">
                            {s.patient_id
                              ? (() => {
                                  const p = patients.find(x => x.id === s.patient_id);
                                  return p ? (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || 'Patient')) : 'Patient';
                                })()
                              : 'Client Comptoir'}
                          </td>
                          <td className="p-3">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {s.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-sm text-slate-900">{s.final_amount} FCFA</td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isCancelled
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-rose-100 text-rose-800'
                              )}
                            >
                              {isCompleted ? 'Validé' : isCancelled ? 'Annulé' : 'Remboursé'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {isRefunded || isCancelled ? (
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded',
                                  s.refund_to_stock ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                                )}
                              >
                                {s.refund_to_stock ? '✅ Remis au stock' : '❌ Non réintégré'}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReceiptData({
                                    reference: s.reference,
                                    number: s.reference,
                                    patientName: s.patient_id
                                      ? (() => {
                                          const p = patients.find(x => x.id === s.patient_id);
                                          return p ? (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || 'Patient')) : 'Patient';
                                        })()
                                      : 'Client Comptoir',
                                    date: s.created_at,
                                    items: s.items?.map(it => ({
                                      description: it.medicine_name,
                                      quantity: it.quantity,
                                      unitPrice: it.unit_price,
                                      totalPrice: it.subtotal,
                                    })) || [],
                                    subtotal: s.total_amount,
                                    discount: s.discount,
                                    total: s.final_amount,
                                    paidAmount: s.final_amount,
                                    paymentMethod: s.payment_method,
                                    cashierName: 'Pharmacie Al Shifa',
                                  });
                                  setShowReceiptModal(true);
                                }}
                                className="text-xs p-1.5 h-7 text-blue-600 hover:bg-blue-50"
                                title="Voir le reçu"
                              >
                                <ReceiptIcon className="w-3.5 h-3.5" />
                              </Button>

                              {isCompleted && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenRefundModal(s)}
                                  className="text-xs p-1.5 h-7 text-amber-600 hover:bg-amber-50"
                                  title="Rembourser"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL : NOUVEAU / MODIFIER MÉDICAMENT (MODALSHELL SANS FLOU)              */}
      {/* ========================================================================= */}
      {showNewStockModal && (
        <ModalShell
          icon={<Package className="w-5 h-5 text-teal-400" />}
          title={editingStockItem ? 'Modifier le Médicament' : 'Nouveau Médicament au Stock'}
          subtitle="Ajout et enregistrement d'une référence au stock de la pharmacie"
          color="teal"
          maxWidth="xl"
          onClose={() => setShowNewStockModal(false)}
          footer={
            <>
              <CancelButton onClick={() => setShowNewStockModal(false)} />
              <SubmitButton color="teal" onClick={handleSaveMedicine}>
                <CheckCircle className="w-4 h-4" />
                {editingStockItem ? 'Sauvegarder les Modifications' : 'Créer le Produit'}
              </SubmitButton>
            </>
          }
        >
          <form onSubmit={handleSaveMedicine} className="space-y-4">
            {/* Banner si produit reconnu dans le stock */}
            {(matchingStockFound || editingStockItem) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 shadow-xs animate-fade-in">
                <div className="p-1 bg-blue-100 text-blue-700 rounded-lg font-bold flex-shrink-0 mt-0.5">
                  🔄
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold block">
                    Produit reconnu : {matchingStockFound?.medicine_name || editingStockItem?.medicine_name}
                  </span>
                  <p className="text-[11px] text-blue-700 font-medium">
                    Stock actuel : <strong>{matchingStockFound?.quantity_available ?? editingStockItem?.quantity_available ?? 0} unités</strong> | Prix public : <strong>{(matchingStockFound?.sale_price ?? editingStockItem?.sale_price ?? 0).toLocaleString()} FCFA</strong>.
                    Vous pouvez modifier ses tarifs, sa quantité ou son statut ci-dessous.
                  </p>
                </div>
              </div>
            )}

            <FormSection title="1. Identification du Médicament" icon={<Package className="w-4 h-4 text-teal-600" />}>
              <div className="relative">
                <FormField label="Nom Commercial du Médicament" required>
                  <ModalInput
                    accent="teal"
                    required
                    placeholder="Tapez pour rechercher (Ex: Paracétamol, Amoxicilline...)"
                    value={newMedicineForm.medicine_name || ''}
                    onChange={e => handleMedicineNameChange(e.target.value)}
                    onFocus={() => {
                      if (medSuggestions.length > 0) setShowMedSuggestions(true);
                    }}
                  />
                </FormField>

                {/* Dropdown de suggestions automatiques */}
                {showMedSuggestions && medSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Suggestions trouvées ({medSuggestions.length}) :
                    </div>
                    {medSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMedSuggestion(sug)}
                        className="w-full px-3.5 py-2 text-left hover:bg-teal-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{sug.medicine_name}</span>
                          <span className="text-[10px] text-slate-400 block">{sug.laboratory || 'Générique'} · {sug.category || 'Pharmacie'}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sug._source === 'stock' || sug.quantity_available !== undefined ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                              En Stock ({sug.quantity_available} dispo)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                              Catalogue
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Code / Référence">
                  <ModalInput
                    accent="teal"
                    placeholder="Ex: MED-001"
                    value={newMedicineForm.medicine_code || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, medicine_code: e.target.value })}
                  />
                </FormField>
                <FormField label="Code-Barres EAN (Scanner / Manuel)">
                  <ModalInput
                    accent="teal"
                    placeholder="Ex: 619123456789"
                    value={newMedicineForm.barcode || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, barcode: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Catégorie">
                  <select
                    value={newMedicineForm.category || 'Antalgiques / Antipyrétiques'}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {MEDICINE_CATEGORIES.filter(c => c !== 'Tous').map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Emplacement / Rayon">
                  <ModalInput
                    accent="teal"
                    placeholder="Ex: Rayon B2, Frigo..."
                    value={newMedicineForm.location || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, location: e.target.value })}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="2. Dates, Traçabilité & Livreur" icon={<Truck className="w-4 h-4 text-blue-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Date d'Arrivée / Entrée">
                  <ModalInput
                    accent="blue"
                    type="date"
                    value={newMedicineForm.entry_date || new Date().toISOString().slice(0, 10)}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, entry_date: e.target.value })}
                  />
                </FormField>
                <FormField label="Date d'Expiration / Péremption" required>
                  <ModalInput
                    accent="blue"
                    type="date"
                    required
                    value={newMedicineForm.expiration_date || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, expiration_date: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Fournisseur / Livré par">
                  <ModalInput
                    accent="blue"
                    placeholder="Ex: PharmaPlus, Dr. Diallo..."
                    value={newMedicineForm.supplier || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, supplier: e.target.value })}
                  />
                </FormField>
                <FormField label="Téléphone du Fournisseur / Livreur">
                  <ModalInput
                    accent="blue"
                    placeholder="Ex: +221 77 000 00 00"
                    value={newMedicineForm.supplier_phone || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, supplier_phone: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="N° de Lot">
                  <ModalInput
                    accent="blue"
                    placeholder="Ex: LOT-2026-A"
                    value={newMedicineForm.lot_number || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, lot_number: e.target.value })}
                  />
                </FormField>
                <FormField label="Laboratoire Fabricant">
                  <ModalInput
                    accent="blue"
                    placeholder="Ex: Sanofi, Saidal..."
                    value={newMedicineForm.laboratory || ''}
                    onChange={e => setNewMedicineForm({ ...newMedicineForm, laboratory: e.target.value })}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="3. Tarification & Stock (FCFA)" icon={<DollarSign className="w-4 h-4 text-emerald-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Prix d'Achat (FCFA)">
                  <ModalInput
                    accent="emerald"
                    type="number"
                    min="0"
                    step="50"
                    value={newMedicineForm.purchase_price || 0}
                    onChange={e =>
                      setNewMedicineForm({ ...newMedicineForm, purchase_price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </FormField>
                <FormField label="Prix de Vente Public (FCFA)" required>
                  <ModalInput
                    accent="emerald"
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={newMedicineForm.sale_price || 0}
                    onChange={e =>
                      setNewMedicineForm({ ...newMedicineForm, sale_price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Quantité en Stock">
                  <ModalInput
                    accent="emerald"
                    type="number"
                    min="0"
                    value={newMedicineForm.quantity_available || 0}
                    onChange={e =>
                      setNewMedicineForm({ ...newMedicineForm, quantity_available: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </FormField>
                <FormField label="Seuil d'Alerte Minimum">
                  <ModalInput
                    accent="emerald"
                    type="number"
                    min="1"
                    value={newMedicineForm.minimum_threshold || 5}
                    onChange={e =>
                      setNewMedicineForm({ ...newMedicineForm, minimum_threshold: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </FormField>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setNewMedicineForm(prev => ({ ...prev, purchase_price: 0, sale_price: 0 }))}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                >
                  Effacer / Réinitialiser les prix à 0
                </button>
              </div>
            </FormSection>

            {/* ─── SECTION 4: DISPONIBILITÉ & STATUT ────────────────────────── */}
            <FormSection title="4. Statut & Disponibilité" icon={<CheckCircle className="w-4 h-4 text-purple-600" />}>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {newMedicineForm.is_active !== false ? '✅ Produit Disponible' : '⏸️ Indisponible pour le moment'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {newMedicineForm.is_active !== false
                      ? 'Ce médicament est actif et visible pour la vente au comptoir.'
                      : 'Ce médicament est temporairement masqué du panier de vente.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewMedicineForm(prev => ({ ...prev, is_active: prev.is_active === false }))}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs',
                    newMedicineForm.is_active !== false
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  )}
                >
                  {newMedicineForm.is_active !== false ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </FormSection>
          </form>
        </ModalShell>
      )}

      {/* ========================================================================= */}
      {/* MODAL : ENTRÉE DE STOCK / RÉAPPROVISIONNEMENT                             */}
      {/* ========================================================================= */}
      {showStockEntryModal && (
        <ModalShell
          icon={<Truck className="w-5 h-5 text-indigo-400" />}
          title="Nouvelle Entrée de Stock (Fournisseur)"
          subtitle="Réception de commande et réapprovisionnement du stock"
          color="indigo"
          maxWidth="xl"
          onClose={() => setShowStockEntryModal(false)}
          footer={
            <>
              <CancelButton onClick={() => setShowStockEntryModal(false)} />
              <SubmitButton color="indigo" onClick={handleSaveStockEntry}>
                <CheckCircle className="w-4 h-4" />
                Valider l'Entrée en Stock
              </SubmitButton>
            </>
          }
        >
          <form onSubmit={handleSaveStockEntry} className="space-y-4">
            <FormSection title="1. Choix de la Référence & Quantité" icon={<Package className="w-4 h-4 text-indigo-600" />}>
              <FormField label="Médicament à Approvisionner" required>
                <select
                  required
                  value={selectedStockForEntry?.id || ''}
                  onChange={e => {
                    const st = stock.find(s => s.id === e.target.value);
                    setSelectedStockForEntry(st || null);
                    if (st) {
                      setStockEntryForm(prev => ({
                        ...prev,
                        purchase_price: st.purchase_price,
                        supplier: st.supplier || '',
                      }));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Sélectionner un médicament existant --</option>
                  {stock.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.medicine_name} (Stock actuel: {s.quantity_available})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Quantité Reçue" required>
                  <ModalInput
                    accent="purple"
                    type="number"
                    min="1"
                    required
                    value={stockEntryForm.quantity}
                    onChange={e => setStockEntryForm({ ...stockEntryForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                </FormField>
                <FormField label="Prix d'Achat Unitaire (FCFA)">
                  <ModalInput
                    accent="purple"
                    type="number"
                    min="0"
                    step="10"
                    value={stockEntryForm.purchase_price}
                    onChange={e =>
                      setStockEntryForm({ ...stockEntryForm, purchase_price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="2. Fournisseur & Lot Livré" icon={<Truck className="w-4 h-4 text-blue-600" />}>
              <FormField label="Fournisseur / Laboratoire">
                <ModalInput
                  accent="blue"
                  placeholder="Ex: Saidal, Biopharm, Hikma..."
                  value={stockEntryForm.supplier}
                  onChange={e => setStockEntryForm({ ...stockEntryForm, supplier: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="N° de Lot Livré">
                  <ModalInput
                    accent="blue"
                    placeholder="Ex: LOT-2026-09"
                    value={stockEntryForm.lot_number}
                    onChange={e => setStockEntryForm({ ...stockEntryForm, lot_number: e.target.value })}
                  />
                </FormField>
                <FormField label="Date d'Expiration du Lot">
                  <ModalInput
                    accent="blue"
                    type="date"
                    value={stockEntryForm.expiration_date}
                    onChange={e => setStockEntryForm({ ...stockEntryForm, expiration_date: e.target.value })}
                  />
                </FormField>
              </div>
            </FormSection>
          </form>
        </ModalShell>
      )}

      {/* ========================================================================= */}
      {/* MODAL : REMBOURSEMENT AVEC CHOIX RETOUR STOCK                             */}
      {/* ========================================================================= */}
      {showRefundModal && saleToRefund && (
        <ModalShell
          icon={<RotateCcw className="w-5 h-5 text-rose-400" />}
          title={`Remboursement Vente ${saleToRefund.reference}`}
          subtitle="Annulation de vente et régularisation de la caisse"
          color="rose"
          maxWidth="md"
          onClose={() => setShowRefundModal(false)}
          footer={
            <>
              <CancelButton onClick={() => setShowRefundModal(false)} />
              <button
                type="button"
                disabled={isProcessingRefund}
                onClick={handleConfirmRefund}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessingRefund ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirmer le Remboursement
                  </>
                )}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
              <p className="text-slate-600 text-xs font-semibold">Montant total à déduire de la caisse :</p>
              <p className="text-2xl font-black text-rose-700 font-mono mt-0.5">{saleToRefund.final_amount} FCFA</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Client : {saleToRefund.patient_id ? 'Patient Enregistré' : 'Client Comptoir'} · Date :{' '}
                {new Date(saleToRefund.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            {/* Interrupteur retour au stock */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-extrabold text-slate-800 text-xs">
                  Remettre les médicaments au stock disponible ?
                </span>
                <input
                  type="checkbox"
                  checked={refundToStock}
                  onChange={e => setRefundToStock(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </label>
              <p className="text-[11px] text-slate-600">
                {refundToStock
                  ? '✅ Les quantités vendues seront automatiquement récréditées dans le stock disponible.'
                  : '❌ Les articles ne seront pas remis en stock (ex: produit ouvert, endommagé ou jeté).'}
              </p>
            </div>

            {/* Motif de remboursement */}
            <FormField label="Motif du Remboursement">
              <select
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="Retour médicament non utilisé">Retour médicament non utilisé / Boîte scellée</option>
                <option value="Erreur prescription médicale">Erreur prescription médicale</option>
                <option value="Erreur saisie comptoir">Erreur de saisie / Doublon comptoir</option>
                <option value="Demande d'annulation patient">Demande d'annulation du patient</option>
                <option value="Autre motif">Autre motif</option>
              </select>
            </FormField>
          </div>
        </ModalShell>
      )}

      {/* ========================================================================= */}
      {/* MODAL : REÇU & IMPRESSION DU TICKET                                       */}
      {/* ========================================================================= */}
      {showReceiptModal && receiptData && (
        <Receipt receipt={receiptData} onClose={() => setShowReceiptModal(false)} />
      )}
    </div>
  );
}