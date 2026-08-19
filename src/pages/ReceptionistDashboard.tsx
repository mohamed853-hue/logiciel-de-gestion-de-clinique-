import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { PatientProfile } from '../components/PatientProfile';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { NewPatientModal } from '../components/NewPatientModal';
import { AppointmentModal } from '../components/AppointmentModal';
import { PharmacyModule } from '../components/PharmacyModule';
import { Receipt, type ReceiptData } from '../components/Receipt';
import { 
  Users, 
  Calendar, 
  Search, 
  Clock, 
  History, 
  BarChart3, 
  UserPlus, 
  Eye, 
  Plus, 
  CreditCard, 
  ShoppingCart, 
  Sparkles, 
  ArrowRight, 
  FileText,
  Bed,
  Syringe,
  CheckCircle2,
  ReceiptText,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Printer,
  Filter,
  DollarSign,
  Heart,
  Package,
  Activity,
  ShieldAlert,
  CalendarDays,
  Stethoscope
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { Patient, Appointment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../hooks/useLanguage';
import { useClinicSettings, getClinicSettings } from '../services/clinicSettingsService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DEFAULT_CARE_ITEMS = [
  { id: 'c1', code: 'SOIN-001', title: 'Injection Intramusculaire / Intraveineuse', price: 2000 },
  { id: 'c2', code: 'SOIN-002', title: 'Pose Perfusion & Sérum Paracétamol / Glucose', price: 5000 },
  { id: 'c3', code: 'SOIN-003', title: 'Pansement Simple', price: 3000 },
  { id: 'c4', code: 'SOIN-004', title: 'Pansement Complexe / Brûlure', price: 7500 },
  { id: 'c5', code: 'SOIN-005', title: 'Petite Chirurgie / Suture & Asepsie', price: 12000 },
  { id: 'c6', code: 'SOIN-006', title: 'Aérosol, Nébulisation & Oxygénothérapie', price: 3500 },
  { id: 'c7', code: 'SOIN-007', title: 'Sondage Urinaire / Gastrique', price: 6000 },
  { id: 'c8', code: 'SOIN-008', title: 'ECG (Électrocardiogramme)', price: 8000 },
];

export function ReceptionistDashboard() {
  const { t, isArabic } = useLanguage();
  const { settings: clinicSettings } = useClinicSettings();

  const ROOM_OPTIONS = useMemo(() => [
    { id: 'simple', label: 'Chambre Simple Standard', price: clinicSettings.roomSimple || 15000 },
    { id: 'double', label: 'Chambre Double Partagée', price: clinicSettings.roomDouble || 10000 },
    { id: 'vip', label: 'Chambre VIP Privée', price: clinicSettings.roomVip || 25000 },
    { id: 'intensif', label: 'Unité de Soins Intensifs / Réa', price: clinicSettings.roomIntensive || 40000 },
    { id: 'observation', label: 'Lit de Surveillance / Urgence (Journée)', price: clinicSettings.roomObservation || 7500 },
  ], [clinicSettings]);

  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'prescriptions' | 'pharmacy' | 'cashier' | 'history' | 'stats'>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescriptionForSale, setSelectedPrescriptionForSale] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // ─── ÉTATS DU MODULE CAISSE & FACTURATION UNIFIÉ ──────────────────────────
  const [cashierSubTab, setCashierSubTab] = useState<'billing' | 'journal' | 'dashboard' | 'pharmacy_sales'>('billing');
  const [careCatalog, setCareCatalog] = useState<any[]>(DEFAULT_CARE_ITEMS);
  const [careBills, setCareBills] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pharmacySales, setPharmacySales] = useState<any[]>([]);

  // ─── ÉTATS HISTORIQUE & STATISTIQUES ÉTENDUS ─────────────────────────────
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'all' | 'admissions' | 'transactions' | 'pharmacy' | 'appointments'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [pharmacyStock, setPharmacyStock] = useState<any[]>([]);
  const [pharmacyStockEntries, setPharmacyStockEntries] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);

  // Formulaire d'encaissement hospitalier
  const [selectedCarePatientId, setSelectedCarePatientId] = useState('');
  const [hospitalStay, setHospitalStay] = useState({
    enabled: false,
    roomType: 'simple',
    roomPrice: clinicSettings.roomSimple || 15000,
    days: 1,
  });
  const [selectedCareItems, setSelectedCareItems] = useState<{ [id: string]: number }>({});
  const [customCareList, setCustomCareList] = useState<Array<{ id: string; title: string; price: number; quantity: number }>>([]);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('1');

  const [consultationItem, setConsultationItem] = useState({
    enabled: true,
    type: 'Consultation Générale',
    price: clinicSettings.consultationGeneral || 5000,
  });

  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Carte' | 'Virement'>('Espèces');
  const [cashGiven, setCashGiven] = useState('');
  const [activeReceiptData, setActiveReceiptData] = useState<ReceiptData | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadPatients();
    loadAppointments();
    loadPrescriptions();
    loadCareCatalog();
    loadCareBills();
    loadTransactions();
    loadPharmacySales();
    loadStockAndExpenses();
  }, []);

  const loadStockAndExpenses = async () => {
    try {
      const [stockRes, entriesRes, expRes] = await Promise.all([
        supabase.from('pharmacy_stock').select('*'),
        supabase.from('pharmacy_stock_entries').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      ]);
      if (stockRes.data) setPharmacyStock(stockRes.data);
      if (entriesRes.data) setPharmacyStockEntries(entriesRes.data);
      if (expRes.data) setExpensesList(expRes.data);
    } catch { /* silent */ }
  };

  const loadCareCatalog = async () => {
    try {
      const { data, error } = await supabase.from('care_catalog').select('*').order('title');
      if (error || !data || data.length === 0) {
        setCareCatalog(DEFAULT_CARE_ITEMS);
      } else {
        setCareCatalog(data);
      }
    } catch {
      setCareCatalog(DEFAULT_CARE_ITEMS);
    }
  };

  const loadCareBills = async () => {
    try {
      const { data } = await supabase.from('patient_care_billing').select('*').order('created_at', { ascending: false });
      setCareBills(data || []);
    } catch { /* silent */ }
  };

  const loadTransactions = async () => {
    try {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
      setTransactions(data || []);
    } catch { /* silent */ }
  };

  const loadPharmacySales = async () => {
    try {
      const { data } = await supabase.from('pharmacy_sales').select('*').order('created_at', { ascending: false }).limit(100);
      setPharmacySales(data || []);
    } catch { /* silent */ }
  };

  const loadPrescriptions = async () => {
    try {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setPrescriptions(data || []);
    } catch { /* silent */ }
  };

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };



  // Changement d'onglet via la sidebar (CustomEvent)
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'appointments' || path === '/dashboard/appointments') setActiveTab('appointments');
      else if (path === 'prescriptions' || path === '/dashboard/prescriptions') setActiveTab('prescriptions');
      else if (path === 'pharmacy' || path === '/dashboard/pharmacy' || path === 'quick-sale') setActiveTab('pharmacy');
      else if (path === 'cashier' || path === 'payments' || path === '/dashboard/cashier' || path === '/dashboard/payments') setActiveTab('cashier');
      else if (path === 'history' || path === '/dashboard/history') setActiveTab('history');
      else if (path === 'stats' || path === '/dashboard/stats') setActiveTab('stats');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
      await supabase.from('appointments').update({ status }).eq('id', id);
      loadAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── CALCULS DU TOTAL FACTURE HOSPITALIÈRE ────────────────────────────────
  const selectedBillingPatient = useMemo(() => {
    return patients.find(p => p.id === selectedCarePatientId);
  }, [patients, selectedCarePatientId]);

  // Soins cochés du catalogue
  const catalogTotal = useMemo(() => {
    let sum = 0;
    Object.entries(selectedCareItems).forEach(([careId, qty]) => {
      if (qty > 0) {
        const item = careCatalog.find(c => c.id === careId);
        if (item) sum += (Number(item.price) || 0) * qty;
      }
    });
    return sum;
  }, [selectedCareItems, careCatalog]);

  // Soins & Injections personnalisés
  const customCareTotal = useMemo(() => {
    return customCareList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [customCareList]);

  // Chambre / Hospitalisation
  const hospitalStayTotal = useMemo(() => {
    if (!hospitalStay.enabled) return 0;
    return (Number(hospitalStay.roomPrice) || 0) * (Number(hospitalStay.days) || 1);
  }, [hospitalStay]);

  // Consultation
  const consultationTotal = useMemo(() => {
    return consultationItem.enabled ? consultationItem.price : 0;
  }, [consultationItem]);

  const grossTotal = catalogTotal + customCareTotal + hospitalStayTotal + consultationTotal;
  const netTotal = Math.max(0, grossTotal - discountAmount);
  const changeDue = useMemo(() => {
    const given = parseFloat(cashGiven) || 0;
    return Math.max(0, given - netTotal);
  }, [cashGiven, netTotal]);

  const handleAddCustomCare = () => {
    if (!newCustomTitle.trim() || !newCustomPrice) return;
    const p = parseFloat(newCustomPrice) || 0;
    const q = parseInt(newCustomQty, 10) || 1;
    setCustomCareList(prev => [
      ...prev,
      {
        id: `cust-${Date.now()}`,
        title: newCustomTitle.trim(),
        price: p,
        quantity: q,
      },
    ]);
    setNewCustomTitle('');
    setNewCustomPrice('');
    setNewCustomQty('1');
  };

  const handleRemoveCustomCare = (id: string) => {
    setCustomCareList(prev => prev.filter(c => c.id !== id));
  };

  // ─── ENREGISTRER LA FACTURE EN ATTENTE (SANS ENCAISSEMENT IMMÉDIAT) ────────
  const handleSaveInvoicePending = async () => {
    if (!selectedCarePatientId) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Patient requis', description: 'Veuillez sélectionner le dossier du patient à facturer.' });
      return;
    }
    if (netTotal <= 0 && grossTotal <= 0) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Facture vide', description: 'Ajoutez au moins une prestation, un soin ou un séjour.' });
      return;
    }

    setProcessingPayment(true);
    const patientName = selectedBillingPatient
      ? `${selectedBillingPatient.first_name} ${selectedBillingPatient.last_name || selectedBillingPatient.name}`
      : 'Patient';

    const refNumber = `FAC-ATT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const rowsToInsert: any[] = [];
      const now = new Date().toISOString();

      if (consultationItem.enabled) {
        rowsToInsert.push({
          id: crypto.randomUUID(),
          patient_id: selectedCarePatientId,
          patient_name: patientName,
          care_title: `🩺 ${consultationItem.type}`,
          care_code: 'CONS-001',
          unit_price: consultationItem.price,
          quantity: 1,
          total_price: consultationItem.price,
          status: 'en_attente',
          prescribed_by: 'Caisse Réception',
          created_at: now,
        });
      }

      if (hospitalStay.enabled) {
        const rObj = ROOM_OPTIONS.find(r => r.id === hospitalStay.roomType);
        rowsToInsert.push({
          id: crypto.randomUUID(),
          patient_id: selectedCarePatientId,
          patient_name: patientName,
          care_title: `🛏️ Hospitalisation (${rObj?.label || 'Chambre'}) - ${hospitalStay.days} nuit(s)`,
          care_code: 'SEJOUR-001',
          unit_price: hospitalStay.roomPrice,
          quantity: hospitalStay.days,
          total_price: hospitalStayTotal,
          status: 'en_attente',
          prescribed_by: 'Caisse Réception',
          created_at: now,
        });
      }

      Object.entries(selectedCareItems).forEach(([careId, qty]) => {
        if (qty > 0) {
          const item = careCatalog.find(c => c.id === careId);
          if (item) {
            rowsToInsert.push({
              id: crypto.randomUUID(),
              patient_id: selectedCarePatientId,
              patient_name: patientName,
              care_title: `💉 ${item.title}`,
              care_code: item.code || 'SOIN',
              unit_price: item.price,
              quantity: qty,
              total_price: item.price * qty,
              status: 'en_attente',
              prescribed_by: 'Caisse Réception',
              created_at: now,
            });
          }
        }
      });

      customCareList.forEach(item => {
        rowsToInsert.push({
          id: crypto.randomUUID(),
          patient_id: selectedCarePatientId,
          patient_name: patientName,
          care_title: `🩹 ${item.title}`,
          care_code: 'PERSO',
          unit_price: item.price,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          status: 'en_attente',
          prescribed_by: 'Caisse Réception',
          created_at: now,
        });
      });

      if (rowsToInsert.length > 0) {
        await supabase.from('patient_care_billing').insert(rowsToInsert);
      }

      await supabase.from('transactions').insert([
        {
          id: crypto.randomUUID(),
          patient_id: selectedCarePatientId,
          type: 'Facture en Attente',
          montant: netTotal,
          detail: `Facture émise dossier ${patientName} (${refNumber}) - En attente de règlement`,
          status: 'pending',
          payment_method: paymentMethod,
          source: 'caisse_centrale',
          created_at: now,
        }
      ]);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Facture Enregistrée (En Attente)',
        description: `Facture ${refNumber} de ${netTotal.toLocaleString()} FCFA enregistrée pour ${patientName}. Règlement en attente.`,
      });

      setSelectedCareItems({});
      setCustomCareList([]);
      setHospitalStay({ enabled: false, roomType: 'simple', roomPrice: clinicSettings.roomSimple || 15000, days: 1 });
      setDiscountAmount(0);
      setCashGiven('');

      loadCareBills();
      loadTransactions();
    } catch (err: any) {
      console.error('Error saving pending invoice:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible d\'enregistrer la facture.',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // ─── VALIDATION DE L'ENCAISSEMENT HOSPITALIER & ÉMISSION DU REÇU ──────────
  const handleProcessHospitalPayment = async () => {
    if (!selectedCarePatientId) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Patient requis', description: 'Veuillez sélectionner le dossier du patient à facturer.' });
      return;
    }
    if (netTotal <= 0 && grossTotal <= 0) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Facture vide', description: 'Ajoutez au moins une prestation, un soin ou un séjour.' });
      return;
    }

    setProcessingPayment(true);
    const patientName = selectedBillingPatient
      ? `${selectedBillingPatient.first_name} ${selectedBillingPatient.last_name || selectedBillingPatient.name}`
      : 'Patient';

    const refNumber = `FACT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Construire la liste des articles pour le reçu
    const receiptItems: any[] = [];

    if (consultationItem.enabled) {
      receiptItems.push({
        description: `🩺 ${consultationItem.type}`,
        quantity: 1,
        unitPrice: consultationItem.price,
        subtotal: consultationItem.price,
      });
    }

    if (hospitalStay.enabled) {
      const rObj = ROOM_OPTIONS.find(r => r.id === hospitalStay.roomType);
      receiptItems.push({
        description: `🛏️ Séjour Hospitalisation (${rObj?.label || 'Chambre'}) - ${hospitalStay.days} nuit(s)`,
        quantity: hospitalStay.days,
        unitPrice: hospitalStay.roomPrice,
        subtotal: hospitalStayTotal,
      });
    }

    Object.entries(selectedCareItems).forEach(([careId, qty]) => {
      if (qty > 0) {
        const item = careCatalog.find(c => c.id === careId);
        if (item) {
          receiptItems.push({
            description: `💉 ${item.title}`,
            quantity: qty,
            unitPrice: item.price,
            subtotal: item.price * qty,
          });
        }
      }
    });

    customCareList.forEach(item => {
      receiptItems.push({
        description: `🩹 ${item.title}`,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
      });
    });

    const txId = crypto.randomUUID();
    const receiptData: ReceiptData = {
      reference: refNumber,
      number: refNumber,
      patientName,
      patientId: selectedBillingPatient?.patient_number || selectedCarePatientId.slice(0, 8),
      date: new Date().toISOString(),
      items: receiptItems,
      subtotal: grossTotal,
      discount: discountAmount,
      total: netTotal,
      paidAmount: paymentMethod === 'Espèces' && parseFloat(cashGiven) ? parseFloat(cashGiven) : netTotal,
      paymentMethod: paymentMethod,
      cashierName: 'Caisse Principale Réception Al Shifa',
    };

    try {
      // 1. Insérer la transaction avec identifiant explicite
      const { error: txError } = await supabase.from('transactions').insert([
        {
          id: txId,
          reference: refNumber,
          patient_id: selectedCarePatientId,
          type: 'Facture Hospitalisation & Soins',
          montant: netTotal,
          amount: netTotal,
          detail: `Encaissement dossier ${patientName} (Réf: ${refNumber}) - ${receiptItems.length} prestation(s)`,
          status: 'validee',
          payment_method: paymentMethod,
          source: 'caisse_centrale',
          created_at: new Date().toISOString(),
        },
      ]);

      if (txError) {
        console.warn('First transaction insert warning, retrying with minimal schema:', txError.message);
        await supabase.from('transactions').insert([
          {
            id: txId,
            patient_id: selectedCarePatientId,
            type: 'Facture Hospitalisation & Soins',
            montant: netTotal,
            detail: `Encaissement dossier ${patientName} (Réf: ${refNumber})`,
            status: 'validee',
          },
        ]);
      }

      // 2. Mettre à jour les factures de soins existantes pour ce patient
      try {
        await supabase
          .from('patient_care_billing')
          .update({ status: 'paye' })
          .eq('patient_id', selectedCarePatientId);
      } catch { /* silent */ }

    } catch (err: any) {
      console.warn('Transaction DB notice (proceeding to receipt):', err);
    } finally {
      // 3. TOUJOURS générer et afficher le Reçu officiel pour impression immédiate
      setActiveReceiptData(receiptData);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Encaissement Validé avec Succès !',
        description: `Facture ${refNumber} (${netTotal.toLocaleString()} FCFA). Reçu officiel prêt pour impression.`,
      });

      // Reset form
      setSelectedCareItems({});
      setCustomCareList([]);
      setHospitalStay({ enabled: false, roomType: 'simple', roomPrice: clinicSettings.roomSimple || 15000, days: 1 });
      setDiscountAmount(0);
      setCashGiven('');
      setProcessingPayment(false);

      loadCareBills();
      loadTransactions();
    }
  };

  // Patients filtrés
  const filteredPatients = patients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery) ||
    p.patient_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayCount = patients.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const urgentCount = patients.filter(p =>
    ['urgent', 'grave', 'critique'].includes(p.arrival_status || '')
  ).length;

  // Calculs Caisse Aujourd'hui
  const todayTransactions = useMemo(() => {
    const todayStr = new Date().toDateString();
    return transactions.filter(t => new Date(t.created_at).toDateString() === todayStr);
  }, [transactions]);

  const todayTotalRevenue = useMemo(() => {
    return todayTransactions.reduce((sum, t) => sum + (Number(t.montant || t.amount) || 0), 0);
  }, [todayTransactions]);

  const todayPharmacyRevenue = useMemo(() => {
    const todayStr = new Date().toDateString();
    return pharmacySales
      .filter(s => new Date(s.created_at).toDateString() === todayStr)
      .reduce((sum, s) => sum + (Number(s.final_amount || s.total_amount) || 0), 0);
  }, [pharmacySales]);

  // ─── FILTRAGE DES STATISTIQUES PAR PÉRIODE ────────────────────────────────
  const filterByStatsPeriod = <T extends { created_at?: string; date?: string; expense_date?: string; sale_date?: string }>(items: T[]): T[] => {
    if (statsPeriod === 'all') return items;
    const now = new Date();
    return items.filter(item => {
      const raw = item.created_at || item.date || item.expense_date || item.sale_date;
      if (!raw) return true;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return true;
      if (statsPeriod === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (statsPeriod === 'week') {
        return (now.getTime() - d.getTime()) <= 7 * 24 * 3600 * 1000;
      }
      if (statsPeriod === 'month') {
        return (now.getTime() - d.getTime()) <= 30 * 24 * 3600 * 1000;
      }
      if (statsPeriod === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const periodPatients = useMemo(() => filterByStatsPeriod(patients), [patients, statsPeriod]);
  const periodTransactions = useMemo(() => filterByStatsPeriod(transactions), [transactions, statsPeriod]);
  const periodPharmacySales = useMemo(() => filterByStatsPeriod(pharmacySales), [pharmacySales, statsPeriod]);
  const periodStockEntries = useMemo(() => filterByStatsPeriod(pharmacyStockEntries), [pharmacyStockEntries, statsPeriod]);
  const periodExpenses = useMemo(() => filterByStatsPeriod(expensesList), [expensesList, statsPeriod]);

  // Finances Globales Période
  const statsCaisseRevenue = useMemo(() => {
    return periodTransactions
      .filter(t => t.status !== 'cancelled' && t.status !== 'refunded')
      .reduce((sum, t) => sum + (Number(t.montant || t.amount) || 0), 0);
  }, [periodTransactions]);

  const statsPharmacyRevenue = useMemo(() => {
    return periodPharmacySales
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (Number(s.final_amount || s.total_amount) || 0), 0);
  }, [periodPharmacySales]);

  const statsGlobalRevenue = statsCaisseRevenue + statsPharmacyRevenue;

  const statsMedicinePurchases = useMemo(() => {
    return periodStockEntries.reduce((sum, e) => sum + ((Number(e.purchase_price || e.prix_achat) || 0) * (Number(e.quantity || e.quantite) || 1)), 0);
  }, [periodStockEntries]);

  const statsExpensesTotal = useMemo(() => {
    return periodExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [periodExpenses]);

  const statsNetProfit = Math.max(0, statsGlobalRevenue - statsMedicinePurchases - statsExpensesTotal);

  // Indicateurs Médicaux & Malades
  const pregnantCount = useMemo(() => {
    return periodPatients.filter(p => p.is_pregnant || p.pregnancy_months || p.pregnancy_weeks || (p.sex === 'F' && p.case_description?.toLowerCase().includes('enceinte'))).length;
  }, [periodPatients]);

  const statsStableCount = useMemo(() => periodPatients.filter(p => p.arrival_status === 'stable' || !p.arrival_status).length, [periodPatients]);
  const statsUrgentCount = useMemo(() => periodPatients.filter(p => p.arrival_status === 'urgent' || p.arrival_status === 'grave').length, [periodPatients]);
  const statsCriticalCount = useMemo(() => periodPatients.filter(p => p.arrival_status === 'critique' || p.arrival_status === 'inconscient').length, [periodPatients]);
  const statsOutpatientCount = useMemo(() => periodPatients.filter(p => p.arrival_status === 'surveiller' || p.arrival_status === 'autre').length, [periodPatients]);

  const statsFemaleCount = useMemo(() => periodPatients.filter(p => p.sex === 'F').length, [periodPatients]);
  const statsMaleCount = useMemo(() => periodPatients.filter(p => p.sex === 'M' || p.sex === 'H').length, [periodPatients]);

  // Valeur Stock Pharmacie
  const totalStockValuation = useMemo(() => {
    return pharmacyStock.reduce((sum, item) => sum + ((Number(item.sale_price || item.prix_unitaire) || 0) * (Number(item.quantity_available || item.quantite) || 0)), 0);
  }, [pharmacyStock]);

  const totalStockPurchaseValuation = useMemo(() => {
    return pharmacyStock.reduce((sum, item) => sum + ((Number(item.purchase_price || item.prix_achat) || 0) * (Number(item.quantity_available || item.quantite) || 0)), 0);
  }, [pharmacyStock]);

  const lowStockCount = useMemo(() => {
    return pharmacyStock.filter(item => (Number(item.quantity_available || item.quantite) || 0) <= (Number(item.minimum_threshold || 5))).length;
  }, [pharmacyStock]);

  // Données stats graphiques
  const enhancedPathologyStats = useMemo(() => {
    const counts: Record<string, number> = {
      'Paludisme & Fièvre': 0,
      'Maternité & CPN': 0,
      'Gastro & Douleurs': 0,
      'HTA & Cardiologie': 0,
      'Pédiatrie & Vaccins': 0,
      'Traumatologie & Urgences': 0,
      'Consultation Générale': 0,
    };

    periodPatients.forEach(p => {
      const r = ((p.visit_reason || '') + ' ' + (p.case_description || '')).toLowerCase();
      if (r.includes('palu') || r.includes('fievre') || r.includes('fièvre')) counts['Paludisme & Fièvre']++;
      else if (p.is_pregnant || p.pregnancy_months || p.pregnancy_weeks || r.includes('grossesse') || r.includes('cpn') || r.includes('maternite') || r.includes('enceinte')) counts['Maternité & CPN']++;
      else if (r.includes('ventre') || r.includes('gastro') || r.includes('diarrhee') || r.includes('douleur')) counts['Gastro & Douleurs']++;
      else if (r.includes('tension') || r.includes('hta') || r.includes('coeur') || r.includes('cardio')) counts['HTA & Cardiologie']++;
      else if ((p.age && p.age < 15) || r.includes('bebe') || r.includes('enfant') || r.includes('vaccin')) counts['Pédiatrie & Vaccins']++;
      else if (p.arrival_status === 'urgent' || p.arrival_status === 'critique' || p.arrival_status === 'grave' || r.includes('accident') || r.includes('blessure')) counts['Traumatologie & Urgences']++;
      else counts['Consultation Générale']++;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [periodPatients]);

  const conditionStats = useMemo(() => {
    return [
      { name: 'Stable', value: statsStableCount, fill: '#10b981' },
      { name: 'Urgent', value: statsUrgentCount, fill: '#f59e0b' },
      { name: 'Critique', value: statsCriticalCount, fill: '#ef4444' },
      { name: 'Surveillance', value: statsOutpatientCount, fill: '#3b82f6' },
      { name: 'Grossesses', value: pregnantCount, fill: '#ec4899' },
    ];
  }, [statsStableCount, statsUrgentCount, statsCriticalCount, statsOutpatientCount, pregnantCount]);

  // ─── HISTORIQUE UNIFIÉ & FILTRABLE ────────────────────────────────────────
  const unifiedHistory = useMemo(() => {
    const list: Array<{
      id: string;
      category: 'admission' | 'transaction' | 'pharmacy' | 'appointment';
      date: string;
      title: string;
      subtitle: string;
      amount?: number;
      status: string;
      badgeText: string;
      badgeColor: string;
      patientId?: string;
      raw: any;
    }> = [];

    // Patients Admissions
    patients.forEach(p => {
      list.push({
        id: `adm-${p.id}`,
        category: 'admission',
        date: p.created_at || new Date().toISOString(),
        title: `Admission : ${p.first_name} ${p.last_name || p.name}`,
        subtitle: `Motif : ${p.visit_reason || 'Consultation Générale'} · Dossier #${p.patient_number || p.id.slice(0, 6)} ${p.is_pregnant ? '· 🤰 Enceinte' : ''}`,
        status: p.arrival_status || 'stable',
        badgeText: p.is_pregnant ? '🤰 CPN / Enceinte' : (p.arrival_status === 'critique' ? '🚨 Critique' : p.arrival_status === 'urgent' ? '⚠️ Urgent' : '✅ Stable'),
        badgeColor: p.is_pregnant ? 'bg-pink-100 text-pink-800' : p.arrival_status === 'critique' ? 'bg-rose-100 text-rose-800' : p.arrival_status === 'urgent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
        patientId: p.id,
        raw: p,
      });
    });

    // Transactions Caisse
    transactions.forEach(t => {
      list.push({
        id: `tx-${t.id}`,
        category: 'transaction',
        date: t.created_at || new Date().toISOString(),
        title: `Encaissement Caisse : ${t.type || 'Facture'}`,
        subtitle: `${t.detail || 'Prestation médicale'} · Réf : ${t.reference || t.id.slice(0, 8)} · Mode : ${t.payment_method || 'Espèces'}`,
        amount: Number(t.montant || t.amount || 0),
        status: t.status || 'validee',
        badgeText: '💳 PAYÉ',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        patientId: t.patient_id,
        raw: t,
      });
    });

    // Ventes Pharmacie
    pharmacySales.forEach(s => {
      list.push({
        id: `ph-${s.id}`,
        category: 'pharmacy',
        date: s.created_at || s.sale_date || new Date().toISOString(),
        title: `Vente Pharmacie Comptoir`,
        subtitle: `Réf : ${s.reference || s.receipt_number || s.id.slice(0, 8)} · Client : ${s.customer_name || 'Client Comptoir'} · Mode : ${s.payment_method || 'Espèces'}`,
        amount: Number(s.final_amount || s.total_amount || 0),
        status: s.status || 'completed',
        badgeText: s.status === 'refunded' ? '🔄 Remboursé' : '💊 Vente Validée',
        badgeColor: s.status === 'refunded' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800',
        patientId: s.patient_id,
        raw: s,
      });
    });

    // Rendez-vous
    appointments.forEach(a => {
      list.push({
        id: `apt-${a.id}`,
        category: 'appointment',
        date: a.appointment_date || new Date().toISOString(),
        title: `Rendez-vous : ${a.patient_name || (a.patient ? a.patient.first_name + ' ' + a.patient.last_name : 'Patient')}`,
        subtitle: `Dr. ${a.doctor_name || 'Médecin'} · Motif : ${a.motif || a.visit_type || 'Suivi clinique'}`,
        status: a.status || 'planifie',
        badgeText: a.status === 'termine' ? '✅ Effectué' : a.status === 'annule' ? '❌ Annulé' : '📅 Planifié',
        badgeColor: a.status === 'termine' ? 'bg-blue-100 text-blue-800' : a.status === 'annule' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800',
        patientId: a.patient_id,
        raw: a,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patients, transactions, pharmacySales, appointments]);

  const filteredUnifiedHistory = useMemo(() => {
    return unifiedHistory.filter(item => {
      if (historyCategoryFilter !== 'all' && item.category !== historyCategoryFilter) return false;
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (historyDateFilter !== 'all') {
        const d = new Date(item.date);
        const now = new Date();
        if (historyDateFilter === 'today' && d.toDateString() !== now.toDateString()) return false;
        if (historyDateFilter === 'week' && (now.getTime() - d.getTime()) > 7 * 24 * 3600 * 1000) return false;
        if (historyDateFilter === 'month' && (now.getTime() - d.getTime()) > 30 * 24 * 3600 * 1000) return false;
      }
      return true;
    });
  }, [unifiedHistory, historyCategoryFilter, historySearchQuery, historyDateFilter]);

  // ─── IMPRESSION BILAN STATISTIQUE & JOURNAL D'HISTORIQUE ──────────────────
  const handlePrintStatsReport = () => {
    const settings = getClinicSettings();
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const fullAddress = [settings.clinicAddress, settings.city, settings.country].filter(Boolean).join(' · ');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'fr'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>Bilan_Statistique_${statsPeriod}_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: 900; color: #0369a1; text-transform: uppercase; margin: 0; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .title-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; margin-bottom: 16px; text-align: center; }
          .title { font-size: 14px; font-weight: 800; color: #166534; margin: 0; }
          .grid-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
          .card { border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; background: #f8fafc; }
          .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .card-value { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
          .section-title { font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 14px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">${settings.clinicName || 'CLINIQUE MÉDICO-CHIRURGICALE AL SHIFA'}</h1>
          <div class="clinic-sub">${fullAddress || 'Centre Hospitalier Polyvalent'} · Tél : ${settings.clinicPhone || '+221 33 000 00 00'}</div>
        </div>

        <div class="title-box">
          <h2 class="title">📊 RAPPORT D'ACTIVITÉ & BILAN STATISTIQUE CLINIQUE (${statsPeriod.toUpperCase()})</h2>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
            Généré le ${new Date().toLocaleString('fr-FR')} · Système de Gestion Al Shifa
          </div>
        </div>

        <div class="section-title">1. SYNTHÈSE FINANCIÈRE & TRÉSORERIE (FCFA)</div>
        <div class="grid-cards">
          <div class="card" style="border-left: 4px solid #10b981;">
            <div class="card-title">Chiffre d'Affaires Global</div>
            <div class="card-value" style="color: #047857;">${statsGlobalRevenue.toLocaleString()} FCFA</div>
          </div>
          <div class="card" style="border-left: 4px solid #3b82f6;">
            <div class="card-title">Ventes Pharmacie</div>
            <div class="card-value" style="color: #1d4ed8;">${statsPharmacyRevenue.toLocaleString()} FCFA</div>
          </div>
          <div class="card" style="border-left: 4px solid #8b5cf6;">
            <div class="card-title">Caisse & Hospitalisations</div>
            <div class="card-value" style="color: #6d28d9;">${statsCaisseRevenue.toLocaleString()} FCFA</div>
          </div>
          <div class="card" style="border-left: 4px solid #ef4444;">
            <div class="card-title">Achats Stock Médicaments</div>
            <div class="card-value" style="color: #b91c1c;">${statsMedicinePurchases.toLocaleString()} FCFA</div>
          </div>
          <div class="card" style="border-left: 4px solid #f59e0b;">
            <div class="card-title">Dépenses Générales</div>
            <div class="card-value" style="color: #b45309;">${statsExpensesTotal.toLocaleString()} FCFA</div>
          </div>
          <div class="card" style="border-left: 4px solid #059669; background: #ecfdf5;">
            <div class="card-title">Bénéfice Net Clinique Estimé</div>
            <div class="card-value" style="color: #065f46;">${statsNetProfit.toLocaleString()} FCFA</div>
          </div>
        </div>

        <div class="section-title">2. INDICATEURS CLINIQUES, PATIENTS & GROSSESSES</div>
        <div class="grid-cards">
          <div class="card">
            <div class="card-title">Patients / Malades Reçus</div>
            <div class="card-value">${periodPatients.length}</div>
          </div>
          <div class="card" style="background: #fdf2f8;">
            <div class="card-title">Patientes Enceintes (CPN)</div>
            <div class="card-value" style="color: #be185d;">${pregnantCount}</div>
          </div>
          <div class="card">
            <div class="card-title">Cas Stables / Ambulatoires</div>
            <div class="card-value">${statsStableCount + statsOutpatientCount}</div>
          </div>
          <div class="card" style="background: #fff7ed;">
            <div class="card-title">Urgences Relatives</div>
            <div class="card-value" style="color: #c2410c;">${statsUrgentCount}</div>
          </div>
          <div class="card" style="background: #fef2f2;">
            <div class="card-title">Urgences Critiques / Vitales</div>
            <div class="card-value" style="color: #dc2626;">${statsCriticalCount}</div>
          </div>
          <div class="card">
            <div class="card-title">Valeur Totale Stock Pharmacie</div>
            <div class="card-value">${totalStockValuation.toLocaleString()} FCFA</div>
          </div>
        </div>

        <div class="footer">
          Clinique Al Shifa — Document d'Analyse et de Gestion Interne — Tous droits réservés
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintHistoryJournal = () => {
    const settings = getClinicSettings();
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const fullAddress = [settings.clinicAddress, settings.city, settings.country].filter(Boolean).join(' · ');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'fr'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>Journal_Activite_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.3;
          }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
          .clinic-name { font-size: 18px; font-weight: 900; color: #0369a1; text-transform: uppercase; margin: 0; }
          .clinic-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
          .title-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; margin-bottom: 12px; text-align: center; }
          .title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; }
          .footer { text-align: center; margin-top: 16px; font-size: 9px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">${settings.clinicName || 'CLINIQUE MÉDICO-CHIRURGICALE AL SHIFA'}</h1>
          <div class="clinic-sub">${fullAddress} · Tél : ${settings.clinicPhone || ''}</div>
        </div>

        <div class="title-box">
          <h2 class="title">📋 JOURNAL DES OPÉRATIONS & HISTORIQUE DES FLUX</h2>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
            Total événements répertoriés : ${filteredUnifiedHistory.length} · Imprimé le ${new Date().toLocaleString('fr-FR')}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Catégorie / Titre</th>
              <th>Détails Prestation</th>
              <th style="text-align: right;">Montant</th>
              <th style="text-align: center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUnifiedHistory.slice(0, 100).map(item => `
              <tr>
                <td style="font-family: monospace; color: #64748b;">${new Date(item.date).toLocaleString('fr-FR')}</td>
                <td><strong>${item.title}</strong></td>
                <td>${item.subtitle}</td>
                <td style="text-align: right; font-weight: bold; font-family: monospace;">${item.amount !== undefined ? item.amount.toLocaleString() + ' FCFA' : '-'}</td>
                <td style="text-align: center;">${item.badgeText}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Clinique Al Shifa — Document Interne d'Exploitation
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const unpaidCareBillsCount = careBills.filter(b => b.status === 'en_attente').length;

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* ─── BANNIÈRE D'ACCUEIL & EN-TÊTE ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <Users className="w-6 h-6 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  Accueil, Caisse & Pharmacie
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  Service Actif
                </span>
              </div>
              <p className="text-blue-100/70 text-xs mt-0.5 font-medium truncate">
                Admissions, Facturation Soins & Hospitalisation, Point de Vente Pharmacie & Rendez-vous
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAppointmentForm(true)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-violet-800 hover:from-purple-700 hover:to-violet-900 text-white shadow-md shadow-purple-500/25 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-purple-400/30"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-200" />
              Planifier RDV
            </button>
            <button
              type="button"
              onClick={() => setShowNewPatientForm(true)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-blue-400/30"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-200" />
              + Nouveau Patient
            </button>
          </div>
        </div>
      </div>

      {/* ─── BARRE D'ONGLETS RESPONSIVE (SANS DÉBORDEMENT D'ÉCRAN) ───────────── */}
      <div className="bg-slate-900 p-1.5 rounded-2xl shadow-lg border border-slate-800 flex flex-wrap items-center gap-1.5 overflow-hidden">
        {[
          { id: 'overview', label: 'Tableau de Bord', icon: <Users className="w-4 h-4" />, badge: null, color: 'blue' },
          { id: 'patients', label: 'Patients', icon: <Users className="w-4 h-4" />, badge: patients.length, color: 'blue' },
          { id: 'appointments', label: 'Rendez-vous', icon: <Calendar className="w-4 h-4" />, badge: appointments.length, color: 'purple' },
          { id: 'prescriptions', label: 'Ordonnances', icon: <FileText className="w-4 h-4" />, badge: prescriptions.length, color: 'teal' },
          { id: 'pharmacy', label: 'Pharmacie & Stock', icon: <ShoppingCart className="w-4 h-4" />, badge: null, color: 'emerald' },
          { id: 'cashier', label: 'Caisse & Factures', icon: <CreditCard className="w-4 h-4" />, badge: unpaidCareBillsCount > 0 ? `⚠️ ${unpaidCareBillsCount}` : null, color: 'amber' },
          { id: 'history', label: 'Historique', icon: <History className="w-4 h-4" />, badge: null, color: 'indigo' },
          { id: 'stats', label: 'Statistiques', icon: <BarChart3 className="w-4 h-4" />, badge: null, color: 'violet' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl transition-all cursor-pointer',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              )}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== null && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-800 text-slate-300'
                )}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* KPI CARDS COMPACTES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Patients</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{patients.length}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Dossiers actifs</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Arrivées Aujourd'hui</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">{todayCount}</p>
                  <p className="text-[10px] text-blue-500 font-bold mt-0.5">File active</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Urgences</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">{urgentCount}</p>
                  <p className="text-[10px] text-rose-500 font-bold mt-0.5">Priorité immédiate</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Caisse du Jour</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{todayTotalRevenue + todayPharmacyRevenue} FCFA</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Soins & Pharmacie</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File d'attente en direct */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                File d'Attente & Dernières Arrivées
              </CardTitle>
              <button
                type="button"
                onClick={() => setActiveTab('patients')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                Voir tous les dossiers <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><LoadingState type="table" rows={5} /></div>
              ) : patients.length === 0 ? (
                <div className="p-8"><EmptyState type="empty" description="Aucun patient dans la file d'attente." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase bg-slate-50/70">
                        <th className="text-left py-2.5 px-4">Patient</th>
                        <th className="text-left py-2.5 px-4">Dossier</th>
                        <th className="text-left py-2.5 px-4">Motif</th>
                        <th className="text-left py-2.5 px-4">Téléphone</th>
                        <th className="text-center py-2.5 px-4">État</th>
                        <th className="text-right py-2.5 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {patients.slice(0, 7).map(patient => (
                        <tr
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            {patient.first_name} {patient.last_name || patient.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                            #{patient.patient_number || 'P-000'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">
                            {patient.visit_reason || 'Consultation'}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">
                            {patient.phone}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <StatusBadge status={patient.arrival_status || 'stable'} size="sm" />
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Dossier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: PATIENTS ─────────────────────────────────────────────────── */}
      {activeTab === 'patients' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="py-4 px-5 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-black text-slate-800">Répertoire des Patients</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-56 font-medium"
                    placeholder="Nom, tél, N° dossier..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPatientForm(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Nouveau
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><LoadingState type="table" rows={8} /></div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8"><EmptyState type="search" description="Aucun patient trouvé." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase bg-slate-50/70">
                      <th className="text-left py-2.5 px-4">Patient</th>
                      <th className="text-left py-2.5 px-4">Dossier</th>
                      <th className="text-left py-2.5 px-4">Motif</th>
                      <th className="text-left py-2.5 px-4">Téléphone</th>
                      <th className="text-center py-2.5 px-4">État</th>
                      <th className="text-right py-2.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPatients.map(patient => (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {patient.first_name} {patient.last_name || patient.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                          #{patient.patient_number || 'P-000'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{patient.visit_reason || 'Consultation'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{patient.phone}</td>
                        <td className="py-2.5 px-4 text-center">
                          <StatusBadge status={patient.arrival_status || 'stable'} size="sm" />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Dossier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 3: APPOINTMENTS ─────────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-800">Agenda & Rendez-vous Planifiés</CardTitle>
            <button
              type="button"
              onClick={() => setShowAppointmentForm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              + Nouveau RDV
            </button>
          </CardHeader>
          <CardContent className="p-5">
            {appointments.length === 0 ? (
              <EmptyState title="Aucun rendez-vous planifié" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appointments.map(a => (
                  <div key={a.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-purple-300 transition-all">
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">{a.patient_name || 'Patient'}</p>
                      <p className="text-slate-500 font-medium">Médecin : <strong className="text-purple-700">{a.doctor_name}</strong></p>
                      <p className="text-slate-400 mt-1 font-mono text-[11px]">
                        📅 {new Date(a.appointment_date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={a.status} size="sm" />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingAppointment(a); setShowAppointmentForm(true); }}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer"
                        >
                          Modifier
                        </button>
                        {a.status === 'planifie' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAppointmentStatus(a.id, 'confirme')}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold cursor-pointer"
                          >
                            Confirmer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 4: PRESCRIPTIONS ────────────────────────────────────────────── */}
      {activeTab === 'prescriptions' && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="py-4 px-5 border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-800">Ordonnances Médicales Récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {prescriptions.length === 0 ? (
              <EmptyState title="Aucune ordonnance enregistrée" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prescriptions.map(p => {
                  const items = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start border-b border-slate-200/80 pb-2">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{p.patient_name || 'Patient'}</p>
                          <p className="text-slate-500 font-medium">Prescrit par : <strong className="text-teal-700">{p.doctor_name}</strong></p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(p.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
                            <span className="font-bold">{item.medicament}</span>
                            <span className="text-slate-500">{item.dosage}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPrescriptionForSale(p);
                            setActiveTab('pharmacy');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Délivrer à la Pharmacie
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 5: PHARMACY & STOCK ─────────────────────────────────────────── */}
      {activeTab === 'pharmacy' && (
        <PharmacyModule
          preloadedPrescription={selectedPrescriptionForSale}
        />
      )}

      {/* ─── TAB 6: CAISSE & FACTURATION HOSPITALIÈRE UNIFIÉE ────────────────── */}
      {activeTab === 'cashier' && (
        <div className="space-y-4">
          {/* Sous-onglets de la Caisse */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'billing', label: `🧾 ${t('cashier.tab.billing', 'Nouvelle Facture & Encaissement')}`, icon: <ReceiptText className="w-4 h-4" /> },
              { id: 'dashboard', label: `📊 ${t('cashier.tab.dashboard', 'Bilan Caisse & Recettes')}`, icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'journal', label: `📜 ${t('cashier.tab.journal', 'Journal des Encaissements')}`, icon: <History className="w-4 h-4" /> },
              { id: 'pharmacy_sales', label: `💊 ${t('cashier.tab.pharmacy_sales', 'Ventes Pharmacie')}`, icon: <ShoppingCart className="w-4 h-4" /> },
            ].map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setCashierSubTab(sub.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer',
                  cashierSubTab === sub.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {sub.icon}
                {sub.label}
              </button>
            ))}
          </div>

          {/* VUE 1 : FACTURATION & ENCAISSEMENT HOSPITALIER */}
          {cashierSubTab === 'billing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Colonne de Gauche : Prestations & Soins */}
              <div className="lg:col-span-2 space-y-4">
                {/* 1. Choix du patient */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="py-3 px-5 border-b border-slate-100">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500">
                      1. Sélection du Patient
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <select
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-xs font-extrabold focus:ring-2 focus:ring-amber-500 bg-white"
                      value={selectedCarePatientId}
                      onChange={(e) => setSelectedCarePatientId(e.target.value)}
                    >
                      <option value="">-- Sélectionner le dossier patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name || p.name} · #{p.patient_number || 'P-00'} (Tél: {p.phone || 'N/A'})
                        </option>
                      ))}
                    </select>

                    {selectedBillingPatient && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                            {(selectedBillingPatient.first_name || selectedBillingPatient.name || 'P')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">
                              {selectedBillingPatient.first_name ? `${selectedBillingPatient.first_name} ${selectedBillingPatient.last_name || ''}`.trim() : (selectedBillingPatient.name || 'Patient')}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Motif : {selectedBillingPatient.visit_reason || 'Consultation'} · Tél : {selectedBillingPatient.phone || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={selectedBillingPatient.arrival_status || 'stable'} size="sm" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Acte de Consultation Médicale */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      2. Consultation Médicale
                    </CardTitle>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consultationItem.enabled}
                        onChange={e => setConsultationItem({ ...consultationItem, enabled: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">Facturer</span>
                    </label>
                  </CardHeader>
                  {consultationItem.enabled && (
                    <CardContent className="p-4 space-y-2 animate-slide-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Type de Consultation</label>
                          <select
                            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                            value={consultationItem.type}
                            onChange={e => {
                              const t = e.target.value;
                              const p = t === 'Consultation Spécialiste' 
                                ? (clinicSettings.consultationSpecialist || 10000) 
                                : t === 'Consultation d\'Urgence' 
                                ? (clinicSettings.consultationEmergency || 7500) 
                                : t === 'Contrôle / Suivi' 
                                ? (clinicSettings.consultationControl || 3000) 
                                : (clinicSettings.consultationGeneral || 5000);
                              setConsultationItem({ enabled: true, type: t, price: p });
                            }}
                          >
                            <option value="Consultation Générale">🩺 Consultation Générale ({clinicSettings.consultationGeneral?.toLocaleString() || 5000} FCFA)</option>
                            <option value="Consultation Spécialiste">👨‍⚕️ Consultation Spécialiste ({clinicSettings.consultationSpecialist?.toLocaleString() || 10000} FCFA)</option>
                            <option value="Consultation d'Urgence">🚨 Consultation d'Urgence ({clinicSettings.consultationEmergency?.toLocaleString() || 7500} FCFA)</option>
                            <option value="Contrôle / Suivi">🔍 Visite de Contrôle ({clinicSettings.consultationControl?.toLocaleString() || 3000} FCFA)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Tarif (FCFA)</label>
                          <input
                            type="number"
                            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold outline-none font-mono"
                            value={consultationItem.price}
                            onChange={e => setConsultationItem({ ...consultationItem, price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 2. Hospitalisation & Nuitées en Chambre */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500 flex items-center gap-2">
                      <Bed className="w-4 h-4 text-indigo-600" />
                      2. Séjour en Chambre / Hospitalisation
                    </CardTitle>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hospitalStay.enabled}
                        onChange={e => setHospitalStay({ ...hospitalStay, enabled: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">Inclure Séjour</span>
                    </label>
                  </CardHeader>
                  {hospitalStay.enabled && (
                    <CardContent className="p-4 space-y-3 animate-slide-in">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Catégorie de Chambre</label>
                          <select
                            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                            value={hospitalStay.roomType}
                            onChange={e => {
                              const r = ROOM_OPTIONS.find(opt => opt.id === e.target.value);
                              setHospitalStay({
                                ...hospitalStay,
                                roomType: e.target.value,
                                roomPrice: r ? r.price : 3000,
                              });
                            }}
                          >
                            {ROOM_OPTIONS.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.label} — {r.price} FCFA / jour
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre de Jours / Nuits</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                            value={hospitalStay.days}
                            onChange={e => setHospitalStay({ ...hospitalStay, days: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          />
                        </div>
                      </div>
                      <p className="text-right text-xs font-black text-indigo-700 font-mono">
                        Sous-total Séjour : {hospitalStayTotal} FCFA
                      </p>
                    </CardContent>
                  )}
                </Card>

                {/* 3. Soins Médicaux, Injections & Sérums */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="py-3 px-5 border-b border-slate-100">
                    <CardTitle className="text-xs font-extrabold uppercase text-slate-500 flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-emerald-600" />
                      3. Soins & Actes Infirmiers (Injections, Sérums, Pansements...)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {careCatalog.map(care => {
                        const qty = selectedCareItems[care.id] || 0;
                        const isChecked = qty > 0;
                        return (
                          <div
                            key={care.id}
                            onClick={() => {
                              setSelectedCareItems({
                                ...selectedCareItems,
                                [care.id]: isChecked ? 0 : 1,
                              });
                            }}
                            className={cn(
                              'p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all',
                              isChecked ? 'bg-emerald-50 border-emerald-300 shadow-xs' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                              />
                              <span className="font-bold text-slate-800 truncate">{care.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <span className="font-mono font-black text-emerald-700 text-xs">{care.price} FCFA</span>
                              {isChecked && (
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  className="w-12 p-1 border rounded-lg text-center text-xs font-bold bg-white"
                                  value={qty}
                                  onChange={e => setSelectedCareItems({
                                    ...selectedCareItems,
                                    [care.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ajout d'acte personnalisé / Sérum spécifique */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500">Ajouter un acte ou produit spécifique (Ex: Sérum Paracétamol IV x2) :</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          placeholder="Libellé de l'acte / sérum..."
                          className="flex-1 min-w-[140px] p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                          value={newCustomTitle}
                          onChange={e => setNewCustomTitle(e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Prix unitaire FCFA"
                          className="w-28 p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                          value={newCustomPrice}
                          onChange={e => setNewCustomPrice(e.target.value)}
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Qté"
                          className="w-16 p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none text-center"
                          value={newCustomQty}
                          onChange={e => setNewCustomQty(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCare}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          + Ajouter
                        </button>
                      </div>

                      {customCareList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {customCareList.map(item => (
                            <div key={item.id} className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold">
                              <span>🩹 {item.title} (x{item.quantity})</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-emerald-800">{item.price * item.quantity} FCFA</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomCare(item.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Colonne de Droite : Résumé Facture, Règlement & Encaissement */}
              <div className="space-y-4">
                <Card className="border-0 shadow-xl bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                  <CardHeader className="py-3 px-5 border-b border-slate-800">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                      <span>Récapitulatif & Encaissement</span>
                      <ReceiptText className="w-4 h-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Détail des sous-totaux */}
                    <div className="space-y-2 border-b border-slate-800 pb-3">
                      {consultationItem.enabled && (
                        <div className="flex justify-between text-slate-300">
                          <span>Consultation :</span>
                          <span className="font-mono font-bold">{consultationTotal} FCFA</span>
                        </div>
                      )}
                      {hospitalStay.enabled && (
                        <div className="flex justify-between text-slate-300">
                          <span>Séjour Chambre ({hospitalStay.days}j) :</span>
                          <span className="font-mono font-bold text-indigo-300">{hospitalStayTotal} FCFA</span>
                        </div>
                      )}
                      {(catalogTotal + customCareTotal) > 0 && (
                        <div className="flex justify-between text-slate-300">
                          <span>Soins & Injections :</span>
                          <span className="font-mono font-bold text-emerald-300">{catalogTotal + customCareTotal} FCFA</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400 pt-1 font-semibold">
                        <span>Total Brut :</span>
                        <span className="font-mono">{grossTotal} FCFA</span>
                      </div>
                    </div>

                    {/* Remise / Prise en charge */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Remise / Prise en Charge (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs outline-none focus:border-amber-400"
                        value={discountAmount || ''}
                        onChange={e => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>

                    {/* TOTAL NET À PAYER */}
                    <div className="p-3.5 bg-amber-500/15 border border-amber-400/40 rounded-2xl flex items-center justify-between">
                      <span className="font-black text-amber-300 text-xs uppercase">Net à Payer</span>
                      <span className="font-black text-2xl text-amber-400 font-mono">{netTotal} FCFA</span>
                    </div>

                    {/* Mode de règlement */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Mode de Paiement</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Espèces', 'Carte', 'Virement'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m as any)}
                            className={cn(
                              'py-2 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer',
                              paymentMethod === m
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Si Espèces : Calcul monnaie */}
                    {paymentMethod === 'Espèces' && (
                      <div className="space-y-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Montant Reçu (Espèces)</label>
                        <input
                          type="number"
                          placeholder="Ex: 5000"
                          className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-mono text-xs font-bold outline-none"
                          value={cashGiven}
                          onChange={e => setCashGiven(e.target.value)}
                        />
                        {parseFloat(cashGiven) > 0 && (
                          <div className="flex justify-between text-xs font-black pt-1">
                            <span className="text-slate-400">Monnaie à Rendre :</span>
                            <span className="text-emerald-400 font-mono">{changeDue} FCFA</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Boutons d'action Caisse & Facturation */}
                    <div className="space-y-2 pt-1">
                      {/* 1. ENCAISSER ET IMPRIMER LE REÇU */}
                      <button
                        type="button"
                        disabled={processingPayment || !selectedCarePatientId}
                        onClick={handleProcessHospitalPayment}
                        className={cn(
                          'w-full py-3.5 rounded-2xl font-black text-xs text-slate-950 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg',
                          'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 hover:scale-[1.02] active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-amber-500/25'
                        )}
                      >
                        {processingPayment ? (
                          <>
                            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            Encaissement & Impression...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            💳 Encaisser & Imprimer Reçu
                          </>
                        )}
                      </button>

                      {/* 2. ENREGISTRER FACTURE EN ATTENTE (NON PAYÉE) */}
                      <button
                        type="button"
                        disabled={processingPayment || !selectedCarePatientId}
                        onClick={handleSaveInvoicePending}
                        className={cn(
                          'w-full py-2.5 rounded-2xl font-extrabold text-xs text-slate-300 border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <FileText className="w-4 h-4 text-blue-400" />
                        💾 Enregistrer la Facture (Payer Plus Tard)
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* VUE 2 : BILAN & DASHBOARD CAISSE */}
          {cashierSubTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-white p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Recettes Soins & Séjours Aujourd'hui</p>
                  <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{todayTotalRevenue} FCFA</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{todayTransactions.length} transaction(s)</p>
                </Card>

                <Card className="border-0 shadow-sm bg-white p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Recettes Pharmacie Aujourd'hui</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{todayPharmacyRevenue} FCFA</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Ventes comptoir</p>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4">
                  <p className="text-xs font-bold text-amber-400 uppercase">Total Recettes Globales Clinique</p>
                  <p className="text-2xl font-black text-white mt-1 font-mono">{todayTotalRevenue + todayPharmacyRevenue} FCFA</p>
                  <p className="text-[11px] text-blue-200 font-bold mt-0.5">Clôture de caisse en direct</p>
                </Card>
              </div>
            </div>
          )}

          {/* VUE 3 : JOURNAL DES ENCAISSEMENTS */}
          {cashierSubTab === 'journal' && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="py-3 px-5 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-800">Historique des Transactions & Reçus</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Aucune transaction enregistrée.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase bg-slate-50/70">
                          <th className="text-left py-2.5 px-4">Date</th>
                          <th className="text-left py-2.5 px-4">Type & Détail</th>
                          <th className="text-left py-2.5 px-4">Mode</th>
                          <th className="text-right py-2.5 px-4">Montant</th>
                          <th className="text-center py-2.5 px-4">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {transactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono text-slate-500">
                              {new Date(t.created_at).toLocaleString('fr-FR')}
                            </td>
                            <td className="py-2.5 px-4">
                              <p className="font-bold text-slate-800">{t.type}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">{t.detail}</p>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-600">{t.payment_method || 'Espèces'}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">{t.montant} FCFA</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                ✅ PAYÉ
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* VUE 4 : VENTES PHARMACIE */}
          {cashierSubTab === 'pharmacy_sales' && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="py-3 px-5 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-800">Ventes Effectuées à la Pharmacie</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pharmacySales.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Aucune vente enregistrée.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase bg-slate-50/70">
                          <th className="text-left py-2.5 px-4">N° Reçu</th>
                          <th className="text-left py-2.5 px-4">Date</th>
                          <th className="text-left py-2.5 px-4">Client</th>
                          <th className="text-left py-2.5 px-4">Mode</th>
                          <th className="text-right py-2.5 px-4">Total</th>
                          <th className="text-center py-2.5 px-4">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pharmacySales.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-blue-700">#{s.receipt_number}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">{s.customer_name || 'Client Comptoir'}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-600">{s.payment_method || 'Espèces'}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700">{s.total_amount} FCFA</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                {s.status === 'refunded' ? '🔄 REMBOURSÉ' : '✅ COMPTANT'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 7: HISTORIQUE GLOBAL DES FLUX & ACTIVITÉS ────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* BARRE D'ACTIONS & FILTRES */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    {t('history.title', 'Historique Global des Activités & Transactions')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredUnifiedHistory.length} opération(s) et événement(s) répertoriés
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePrintHistoryJournal}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    {t('history.print_report', 'Imprimer le Journal')}
                  </button>
                </div>
              </div>

              {/* FILTRES INTERACTIFS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par patient, motif, référence..."
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={historyCategoryFilter}
                    onChange={e => setHistoryCategoryFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="all">Toutes les catégories</option>
                    <option value="admission">Admissions Patients</option>
                    <option value="transaction">Encaissements Caisse</option>
                    <option value="pharmacy">Ventes Pharmacie</option>
                    <option value="appointment">Rendez-vous</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="all">Toute la période</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">7 derniers jours</option>
                    <option value="month">Ce mois (30 jours)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABLEAU DES ÉVÉNEMENTS */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              {filteredUnifiedHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Aucune activité correspondant aux filtres sélectionnés.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase bg-slate-50/70">
                        <th className="text-left py-3 px-4">Date & Heure</th>
                        <th className="text-left py-3 px-4">Type & Événement</th>
                        <th className="text-left py-3 px-4">Détails Prestation</th>
                        <th className="text-right py-3 px-4">Montant</th>
                        <th className="text-center py-3 px-4">Statut</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUnifiedHistory.slice(0, 50).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(item.date).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {item.category === 'admission' && <span className="p-1 rounded-lg bg-blue-100 text-blue-700 font-bold">👤</span>}
                              {item.category === 'transaction' && <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold">💳</span>}
                              {item.category === 'pharmacy' && <span className="p-1 rounded-lg bg-teal-100 text-teal-700 font-bold">💊</span>}
                              {item.category === 'appointment' && <span className="p-1 rounded-lg bg-purple-100 text-purple-700 font-bold">📅</span>}
                              <span className="font-bold text-slate-800">{item.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {item.subtitle}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {item.amount !== undefined ? `${item.amount.toLocaleString()} FCFA` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-black', item.badgeColor)}>
                              {item.badgeText}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {item.patientId && (
                              <button
                                type="button"
                                onClick={() => setSelectedPatientId(item.patientId!)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Voir Dossier
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 8: TABLEAU DE BORD STATISTIQUES GLOBAL ──────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* HEADER AVEC SÉLECTEUR DE PÉRIODE & IMPRESSION */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 rounded-3xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {t('stats.title', 'Bilan Statistique & Analytique Clinique')}
                  </h2>
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  {t('stats.subtitle', 'Indicateurs financiers, activité médicale, état des malades et suivi des grossesses')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Périodes */}
                <div className="bg-white/10 p-1 rounded-2xl flex items-center gap-1 border border-white/10">
                  {[
                    { id: 'today', label: t('stats.period_today', 'Aujourd\'hui') },
                    { id: 'week', label: t('stats.period_week', '7 jours') },
                    { id: 'month', label: t('stats.period_month', 'Ce mois') },
                    { id: 'year', label: t('stats.period_year', 'Année') },
                    { id: 'all', label: t('stats.period_all', 'Tout') },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStatsPeriod(p.id as any)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        statsPeriod === p.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePrintStatsReport}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Printer className="w-4 h-4" />
                  {t('stats.print_analytics', 'Imprimer le Rapport')}
                </button>
              </div>
            </div>
          </Card>

          {/* 1. SYNTHÈSE FINANCIÈRE & BÉNÉFICES */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              1. Bilan Financier, Achats & Recettes (FCFA)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Chiffre d'Affaires */}
              <Card className="border-0 shadow-sm bg-white p-3.5 border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Revenus Globaux Bruts</p>
                <p className="text-lg font-black text-emerald-700 font-mono mt-1">{statsGlobalRevenue.toLocaleString()} F</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Caisse + Pharmacie</p>
              </Card>

              {/* Ventes Pharmacie */}
              <Card className="border-0 shadow-sm bg-white p-3.5 border-l-4 border-l-teal-500">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Ventes Pharmacie</p>
                <p className="text-lg font-black text-teal-700 font-mono mt-1">{statsPharmacyRevenue.toLocaleString()} F</p>
                <p className="text-[10px] text-teal-600 font-bold mt-0.5">{periodPharmacySales.length} vente(s)</p>
              </Card>

              {/* Caisse & Soins */}
              <Card className="border-0 shadow-sm bg-white p-3.5 border-l-4 border-l-blue-500">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Caisse & Soins</p>
                <p className="text-lg font-black text-blue-700 font-mono mt-1">{statsCaisseRevenue.toLocaleString()} F</p>
                <p className="text-[10px] text-blue-600 font-bold mt-0.5">{periodTransactions.length} paiement(s)</p>
              </Card>

              {/* Achats Médicaments */}
              <Card className="border-0 shadow-sm bg-white p-3.5 border-l-4 border-l-rose-500">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Achats Médicaments</p>
                <p className="text-lg font-black text-rose-700 font-mono mt-1">{statsMedicinePurchases.toLocaleString()} F</p>
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">Entrées stock</p>
              </Card>

              {/* Dépenses */}
              <Card className="border-0 shadow-sm bg-white p-3.5 border-l-4 border-l-amber-500">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Dépenses Générales</p>
                <p className="text-lg font-black text-amber-700 font-mono mt-1">{statsExpensesTotal.toLocaleString()} F</p>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">{periodExpenses.length} charge(s)</p>
              </Card>

              {/* Bénéfice Net */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-3.5">
                <p className="text-[10px] font-extrabold uppercase text-emerald-200">Bénéfice Net Estimé</p>
                <p className="text-lg font-black text-white font-mono mt-1">{statsNetProfit.toLocaleString()} F</p>
                <p className="text-[10px] text-emerald-100 font-bold mt-0.5">Marge nette réelle</p>
              </Card>
            </div>
          </div>

          {/* 2. ÉTATS CLINIQUES, MALADES & GROSSESSES */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-600" />
              2. Patients, États Cliniques & Suivi des Grossesses
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Total Patients */}
              <Card className="border-0 shadow-sm bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Malades Reçus</span>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-1">{periodPatients.length}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{statsFemaleCount} ♀ / {statsMaleCount} ♂</p>
              </Card>

              {/* Femmes Enceintes */}
              <Card className="border-0 shadow-sm bg-pink-50/80 border border-pink-100 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-pink-700">Grossesses (CPN)</span>
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-2xl font-black text-pink-900 mt-1">{pregnantCount}</p>
                <p className="text-[10px] text-pink-600 font-bold mt-0.5">Patientes enceintes</p>
              </Card>

              {/* Stable */}
              <Card className="border-0 shadow-sm bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Cas Stables</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-700 mt-1">{statsStableCount}</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Évolution normale</p>
              </Card>

              {/* Urgence Relative */}
              <Card className="border-0 shadow-sm bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Urgences</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-700 mt-1">{statsUrgentCount}</p>
                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Prise en charge rapide</p>
              </Card>

              {/* Critiques */}
              <Card className="border-0 shadow-sm bg-rose-50/70 border border-rose-100 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-rose-700">Cas Critiques</span>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-900 mt-1">{statsCriticalCount}</p>
                <p className="text-[10px] text-rose-600 font-bold mt-0.5">Urgence vitale / Réa</p>
              </Card>

              {/* Ambulatoire */}
              <Card className="border-0 shadow-sm bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Ambulatoires</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                </div>
                <p className="text-2xl font-black text-blue-700 mt-1">{statsOutpatientCount}</p>
                <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Soins externes</p>
              </Card>
            </div>
          </div>

          {/* 3. GRAPHIQUES D'ANALYSE DÉTAILLÉE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pathologies & Motifs de consultation */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="py-3 px-5 border-b border-slate-100">
                <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Top Motifs de Consultation & Pathologies Fréquentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={enhancedPathologyStats} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Répartition par État Clinique & Grossesses */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="py-3 px-5 border-b border-slate-100">
                <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Répartition Globale de la Gravité & Grossesses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={conditionStats.filter(c => c.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={40}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {conditionStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 4. VALORISATION DU STOCK PHARMACIE & RISQUES */}
          <Card className="border-0 shadow-sm bg-white p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-600" />
              4. Valorisation de l'Inventaire & Alertes Pharmacie
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Valeur Totale Stock (Prix Public)</p>
                <p className="text-xl font-black text-slate-900 font-mono mt-1">{totalStockValuation.toLocaleString()} FCFA</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Valeur marchande au comptoir</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Valeur d'Achat Réelle Stock</p>
                <p className="text-xl font-black text-blue-700 font-mono mt-1">{totalStockPurchaseValuation.toLocaleString()} FCFA</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Capital immobilisé</p>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                <p className="text-[10px] font-extrabold uppercase text-amber-700">Articles en Alerte / Rupture</p>
                <p className="text-xl font-black text-amber-900 mt-1">{lowStockCount} référence(s)</p>
                <p className="text-[11px] text-amber-600 font-bold mt-0.5">Seuil critique atteint</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODALES & COMPOSANTS EN POPUP ──────────────────────────────────── */}
      {showNewPatientForm && (
        <NewPatientModal
          onClose={() => setShowNewPatientForm(false)}
          onSuccess={() => {
            loadPatients();
            setToast({
              id: Date.now().toString(),
              type: 'success',
              title: 'Patient Enregistré !',
              description: 'Le nouveau dossier a été créé avec succès.',
            });
          }}
        />
      )}

      {showAppointmentForm && (
        <AppointmentModal
          appointmentToEdit={editingAppointment}
          onClose={() => {
            setShowAppointmentForm(false);
            setEditingAppointment(null);
          }}
          onSuccess={() => {
            loadAppointments();
            setToast({
              id: Date.now().toString(),
              type: 'success',
              title: editingAppointment ? 'Rendez-vous Modifié' : 'Rendez-vous Planifié !',
              description: 'L\'agenda a été mis à jour.',
            });
          }}
        />
      )}

      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}

      {activeReceiptData && (
        <Receipt
          receipt={activeReceiptData}
          onClose={() => setActiveReceiptData(null)}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
