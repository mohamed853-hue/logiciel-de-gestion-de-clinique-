import { useState, useEffect, useCallback } from 'react';
import { StatusBadge } from './StatusBadge';
import { ModalPortal } from './ModalShell';
import {
  X, User, Phone, Calendar, Heart, FileText,
  FlaskConical, Activity, Clock, Pill,
  CreditCard, AlertTriangle, Download, Printer, ZoomIn,
  ReceiptText
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { Patient, Prescription, LabTest, VitalsRecord, Appointment } from '../types';
import { Receipt } from './Receipt';
import type { ReceiptData } from './Receipt';
import { getClinicSettings } from '../services/clinicSettingsService';
import { useLanguage } from '../hooks/useLanguage';
import { Toast } from './Toast';
import type { ToastMessage } from './Toast';

// ─── File Preview Lightbox ──────────────────────────────────────────────────
interface PreviewFile {
  url: string;
  name: string;
  type: string;
}

function FileLightbox({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  const handlePrint = () => {
    const w = window.open(file.url, '_blank');
    if (w) { w.focus(); w.print(); }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/75 animate-fade-in p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-800 text-sm truncate max-w-sm">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={file.url}
                download={file.name}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </a>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-0">
            {isImage ? (
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-lg border border-slate-200 bg-white"
              />
            ) : isPdf ? (
              <iframe
                src={file.url}
                title={file.name}
                className="w-full h-full min-h-[520px] rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
                <FileText className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="text-slate-600 text-sm font-semibold">Aperçu non supporté pour ce format</p>
                <a
                  href={file.url}
                  download={file.name}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le document
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface PatientProfileProps {
  patientId: string | null;
  onClose: () => void;
  onNewPrescription?: (patient: Patient) => void;
  onNewLabRequest?: (patient: Patient) => void;
}

interface CareBillingItem {
  id: string;
  care_title: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
}

import { getPatientDiagnostics } from '../services/pathologyService';
import type { PatientDiagnostic } from '../types';

type ProfileTab = 'identity' | 'diagnostics' | 'vitals' | 'care-bills' | 'appointments' | 'prescriptions' | 'labs';

export function PatientProfile({ patientId, onClose, onNewPrescription, onNewLabRequest }: PatientProfileProps) {
  const { t, isArabic } = useLanguage();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // Historique & sous-données
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [vitals, setVitals] = useState<VitalsRecord[]>([]);
  const [careBills, setCareBills] = useState<CareBillingItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<PatientDiagnostic[]>([]);

  // Modal paiement direct & Reçu
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeReceiptData, setActiveReceiptData] = useState<ReceiptData | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [pRes, appRes, prescRes, labRes, vitRes, careRes, diagRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('lab_tests').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('vitals_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_care_billing').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        getPatientDiagnostics(patientId),
      ]);

      if (pRes.data) setPatient(pRes.data);
      setAppointments(appRes.data || []);
      setPrescriptions((prescRes.data || []).map((p: any) => ({
        ...p,
        items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []),
      })));
      setLabs(labRes.data || []);
      setVitals(vitRes.data || []);
      setCareBills(careRes.data || []);
      setDiagnostics(diagRes || []);
    } catch (err) {
      console.error('Error loading patient profile:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    loadPatientData();
  }, [patientId, loadPatientData]);

  // Écouteur touche Échap
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!patientId) return null;

  const unpaidBills = careBills.filter(b => b.status === 'en_attente');
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

  // ─── IMPRESSION COMPLÈTE DU DOSSIER PATIENT (A4 OFFICIEL) ─────────────────
  const handlePrintMedicalRecord = () => {
    if (!patient) return;
    const settings = getClinicSettings();
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const vitalsHtml = vitals.length > 0
      ? vitals.map(v => `
        <tr>
          <td>${new Date(v.created_at).toLocaleString('fr-FR')}</td>
          <td><strong>${v.tension || '-'}</strong></td>
          <td>${v.temp ? v.temp + ' °C' : '-'}</td>
          <td>${v.pouls ? v.pouls + ' bpm' : '-'}</td>
          <td>${v.poids ? v.poids + ' kg' : '-'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Aucune constante enregistrée</td></tr>';

    const prescriptionsHtml = prescriptions.length > 0
      ? prescriptions.map(p => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
          <div style="font-weight:bold; font-size:12px; color:#1e293b;">Ordonnance du ${new Date(p.created_at).toLocaleDateString('fr-FR')} - Dr. ${p.doctor_name || 'Médecin'}</div>
          <div style="font-size:11px; color:#475569; margin-top:4px;">
            ${(p.items || []).map((i: any) => `• <strong>${i.name || i.medicine_name}</strong> - ${i.dosage || ''} (${i.duration || ''})`).join('<br/>')}
          </div>
        </div>
      `).join('')
      : '<p style="color:#94a3b8; font-size:12px;">Aucune ordonnance émise</p>';

    const labsHtml = labs.length > 0
      ? labs.map(l => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
          <div style="font-weight:bold; font-size:12px; color:#1e293b;">${l.test_name} - <span style="color:#059669;">${l.status === 'termine' ? '✅ Résultats disponibles' : '⏳ En attente'}</span></div>
          ${l.results_text ? `<div style="font-size:11px; color:#0f766e; background:#f0fdf4; padding:6px; border-radius:4px; margin-top:4px;"><strong>Résultat :</strong> ${l.results_text}</div>` : ''}
        </div>
      `).join('')
      : '<p style="color:#94a3b8; font-size:12px;">Aucun examen de laboratoire</p>';

    const billsHtml = careBills.length > 0
      ? careBills.map(b => `
        <tr>
          <td>${new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
          <td><strong>${b.care_title}</strong></td>
          <td style="text-align:center;">${b.quantity}</td>
          <td style="text-align:right;">${b.total_price.toLocaleString()} FCFA</td>
          <td style="text-align:center;">
            <span style="font-weight:bold; color:${b.status === 'en_attente' ? '#e11d48' : '#059669'};">
              ${b.status === 'en_attente' ? 'NON PAYÉ' : 'PAYÉ'}
            </span>
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Aucun soin facturé</td></tr>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dossier Médical - ${patient.first_name} ${patient.last_name || patient.name}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .clinic-title { font-size: 20px; font-weight: 900; color: #0f766e; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .dossier-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .label { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b; }
          .val { font-size: 13px; font-weight: bold; color: #0f172a; }
          .section-title { font-size: 14px; font-weight: 900; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
          td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-title">${settings.clinicName || 'CLINIQUE MÉDICALE AL-SHIFA'}</div>
            <div class="clinic-sub">${settings.clinicAddress || 'Plateau Médical'}, ${settings.city || 'Abidjan'} - ${settings.country || "Côte d'Ivoire"}</div>
            <div class="clinic-sub">Tél: ${settings.clinicPhone || '+225 07 00 00 00 00'} | Email: ${settings.clinicEmail || 'contact@clinique-alshifa.com'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; color: #0f766e;">DOSSIER MÉDICAL</div>
            <div style="font-family: monospace; font-weight: bold; font-size: 12px;">#${patient.patient_number || patient.id.slice(0, 8).toUpperCase()}</div>
            <div style="font-size: 10px; color: #64748b;">Édité le ${new Date().toLocaleString('fr-FR')}</div>
          </div>
        </div>

        <div class="dossier-box">
          <div class="grid">
            <div>
              <div class="label">Nom complet du patient</div>
              <div class="val">${patient.first_name} ${patient.last_name || patient.name}</div>
            </div>
            <div>
              <div class="label">Âge / Sexe</div>
              <div class="val">${patient.age ? patient.age + ' ans' : '-'} / ${patient.sex === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</div>
            </div>
            <div>
              <div class="label">Groupe Sanguin</div>
              <div class="val" style="color:#e11d48;">🩸 ${patient.blood || 'Non précisé'}</div>
            </div>
            <div>
              <div class="label">Téléphone</div>
              <div class="val">${patient.phone || '-'}</div>
            </div>
            <div>
              <div class="label">État à l'arrivée</div>
              <div class="val">${patient.arrival_status ? patient.arrival_status.toUpperCase() : 'STABLE'}</div>
            </div>
            <div>
              <div class="label">Date d'admission</div>
              <div class="val">${new Date(patient.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          ${patient.is_pregnant ? `
            <div style="margin-top:10px; padding:8px; background:#fdf2f8; border:1px solid #fbcfe8; border-radius:8px; color:#9d174d; font-size:12px;">
              <strong>🤰 PATIENTE ENCEINTE (SUIVI CPN) :</strong> ${patient.pregnancy_months ? patient.pregnancy_months + ' mois' : ''} ${patient.pregnancy_weeks ? '(' + patient.pregnancy_weeks + ' SA)' : ''} ${patient.dpa ? '· DPA prévue : ' + patient.dpa : ''}
            </div>
          ` : ''}
          ${patient.allergies ? `
            <div style="margin-top:8px; font-size:11px; color:#b91c1c;">
              <strong>⚠️ Allergies / Précautions :</strong> ${patient.allergies}
            </div>
          ` : ''}
        </div>

        <div class="section-title">1. Constantes Vitales & Évolution</div>
        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Tension Artérielle</th>
              <th>Température</th>
              <th>Pouls</th>
              <th>Poids</th>
            </tr>
          </thead>
          <tbody>
            ${vitalsHtml}
          </tbody>
        </table>

        <div class="section-title">2. Ordonnances & Traitements Médicaux</div>
        ${prescriptionsHtml}

        <div class="section-title">3. Examens & Résultats de Laboratoire</div>
        ${labsHtml}

        <div class="section-title">4. Prestations, Soins Dispensés & Facturation</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Acte / Soin Infirmer</th>
              <th style="text-align:center;">Quantité</th>
              <th style="text-align:right;">Montant</th>
              <th style="text-align:center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${billsHtml}
          </tbody>
        </table>

        <div class="footer">
          Document confidentiel protégé par le secret médical - ${settings.clinicName || 'Clinique Médicale Al-Shifa'}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  // ─── RÈGLEMENT DIRECT DES FACTURES EN CAISSE ──────────────────────────────
  const handleProcessDirectPayment = async () => {
    if (unpaidBills.length === 0 || !patient) return;
    setIsProcessingPayment(true);

    try {
      const finalAmount = unpaidTotal;
      const paymentRef = `SOIN-${Date.now().toString().slice(-6)}`;

      // 1. Mettre à jour les soins à 'paye'
      const { error: billErr } = await supabase
        .from('patient_care_billing')
        .update({ status: 'paye' })
        .in('id', unpaidBills.map(b => b.id));

      if (billErr) throw billErr;

      // 2. Créer une transaction caisse
      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          patient_id: patient.id,
          type: 'Paiement Soins & Hospitalisation',
          montant: finalAmount,
          status: 'validee',
          reference: paymentRef,
          payment_method: paymentMethod,
          detail: `Règlement de ${unpaidBills.length} soin(s) pour ${patient.first_name} ${patient.last_name || patient.name}`,
        });

      if (txErr) console.warn('Could not insert transaction:', txErr);

      // 3. Préparer le reçu
      const receipt: ReceiptData = {
        reference: paymentRef,
        number: paymentRef,
        date: new Date().toISOString(),
        patientName: `${patient.first_name} ${patient.last_name || patient.name}`,
        patientId: patient.patient_number || patient.id,
        items: unpaidBills.map(b => ({
          description: b.care_title,
          quantity: b.quantity,
          unitPrice: b.unit_price,
          totalPrice: b.total_price,
        })),
        total: finalAmount,
        paidAmount: Number(cashReceived) || finalAmount,
        paymentMethod: paymentMethod,
        cashierName: 'Caisse Principale',
      };

      setActiveReceiptData(receipt);
      setShowDirectPaymentModal(false);
      await loadPatientData();

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Paiement Encaissé !',
        description: `Facture de ${finalAmount.toLocaleString()} FCFA réglée avec succès.`,
      });
    } catch (err: any) {
      console.error('Error processing payment from profile:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erreur d\'encaissement',
        description: err.message || 'Impossible de valider le règlement.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-end bg-slate-950/70 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-slide-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ligne lumineuse supérieure */}
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500 flex-shrink-0" />

          {/* ─── HEADER HERO DU DOSSIER ──────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 relative flex-shrink-0 overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white flex items-center justify-center cursor-pointer border border-white/15"
              title="Fermer (Échap)"
            >
              <X className="w-5 h-5" />
            </button>

            {loading || !patient ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-48 bg-white/20 rounded-xl" />
                <div className="h-4 w-32 bg-white/10 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 flex items-center justify-center text-white font-black text-2xl shadow-xl border-2 border-white/25 flex-shrink-0">
                    {patient.first_name?.[0]}{patient.last_name?.[0] || patient.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-2xl font-black text-white tracking-tight truncate">
                        {patient.first_name} {patient.last_name || patient.name}
                      </h2>
                      {patient.patient_number && (
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/25 text-teal-200 border border-teal-400/30 text-xs font-mono font-black">
                          #{patient.patient_number}
                        </span>
                      )}
                      <StatusBadge status={patient.arrival_status || 'stable'} size="sm" />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300 mt-2 flex-wrap font-semibold">
                      {patient.age && <span className="bg-white/10 px-2 py-0.5 rounded-lg">{patient.age} ans</span>}
                      {patient.sex && (
                        <span className="bg-white/10 px-2 py-0.5 rounded-lg">
                          {patient.sex === 'M' ? 'Homme (M)' : 'Femme (F)'}
                        </span>
                      )}
                      {patient.phone && (
                        <span className="flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-lg font-mono">
                          <Phone className="w-3 h-3 text-teal-300" /> {patient.phone}
                        </span>
                      )}
                      {patient.blood && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-500/30 text-red-200 border border-red-400/30 font-black">
                          🩸 {patient.blood}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BANNIÈRE FACTURE DE SOINS NON PAYÉE */}
                {unpaidBills.length > 0 && (
                  <div className="p-3.5 bg-rose-500/25 border border-rose-400/40 rounded-2xl text-xs text-rose-100 flex items-center justify-between flex-wrap gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      <div>
                        <p className="font-black text-white text-xs">⚠️ {t('profile.unpaid_bills_detected', 'Facture(s) de soins en attente')}</p>
                        <p className="text-[11px] opacity-90">{unpaidBills.length} acte(s) non réglé(s) — Total restant dû : <strong className="text-white font-mono font-black">{unpaidTotal.toLocaleString()} FCFA</strong></p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                      onClick={() => setShowDirectPaymentModal(true)}
                    >
                      <CreditCard className="w-4 h-4" />
                      {t('profile.pay_at_cashier', 'Régler à la Caisse')} ({unpaidTotal.toLocaleString()} FCFA)
                    </button>
                  </div>
                )}

                {/* Barre d'Actions Rapides */}
                <div className="flex gap-2.5 pt-2 border-t border-white/10 flex-wrap items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {onNewPrescription && (
                      <button
                        type="button"
                        className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-white/15 shadow-sm"
                        onClick={() => onNewPrescription(patient)}
                      >
                        <Pill className="w-3.5 h-3.5 text-teal-300" /> Rédiger Ordonnance
                      </button>
                    )}
                    {onNewLabRequest && (
                      <button
                        type="button"
                        className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-white/15 shadow-sm"
                        onClick={() => onNewLabRequest(patient)}
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-cyan-300" /> Demander Analyse
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintMedicalRecord}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs rounded-xl font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-teal-300/30"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    {t('profile.print_dossier', 'Imprimer Dossier Médical')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── ONGLETS DU DOSSIER PATIENT ──────────────────────────────────── */}
          <div className="flex border-b border-slate-200 bg-slate-100/80 px-4 overflow-x-auto scrollbar-none flex-shrink-0 gap-1 pt-1.5">
            {[
              { id: 'identity', label: t('profile.tab.identity', 'Identité & Infos'), icon: <User className="w-3.5 h-3.5" /> },
              { id: 'diagnostics', label: `${isArabic ? 'التشخيص والأمراض' : 'Diagnostics & Pathologies'} (${diagnostics.length})`, icon: <Stethoscope className="w-3.5 h-3.5" /> },
              { id: 'care-bills', label: `${t('profile.tab.care_bills', 'Soins & Factures')} (${unpaidBills.length > 0 ? `⚠️ ${unpaidBills.length}` : careBills.length})`, icon: <CreditCard className="w-3.5 h-3.5" /> },
              { id: 'vitals', label: `${t('profile.tab.vitals', 'Constantes')} (${vitals.length})`, icon: <Activity className="w-3.5 h-3.5" /> },
              { id: 'appointments', label: `${t('profile.tab.appointments', 'RDV')} (${appointments.length})`, icon: <Calendar className="w-3.5 h-3.5" /> },
              { id: 'prescriptions', label: `${t('profile.tab.prescriptions', 'Ordonnances')} (${prescriptions.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'labs', label: `${t('profile.tab.labs', 'Analyses')} (${labs.length})`, icon: <FlaskConical className="w-3.5 h-3.5" /> },
            ].map((tItem) => (
              <button
                key={tItem.id}
                onClick={() => setActiveTab(tItem.id as ProfileTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-black rounded-t-2xl transition-all whitespace-nowrap cursor-pointer',
                  activeTab === tItem.id
                    ? 'bg-white text-teal-700 shadow-sm border-t-2 border-teal-600'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                )}
              >
                {tItem.icon}
                {tItem.label}
              </button>
            ))}
          </div>

          {/* ─── CONTENU DÉFILANT DU DOSSIER ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Chargement du dossier médical...</div>
            ) : !patient ? (
              <div className="p-12 text-center text-slate-400 font-bold">Patient introuvable dans le système.</div>
            ) : (
              <>
                {/* TAB 0: DIAGNOSTICS & PATHOLOGIES */}
                {activeTab === 'diagnostics' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      {isArabic ? 'سجل الأمراض والتشخيصات الطبية للمريض' : 'Pathologies Diagnostiquées & Suivi Thérapeutique'}
                    </h3>

                    {diagnostics.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-bold">
                        {isArabic ? 'لم يتم تسجيل أي تشخيص لهذا المريض بعد.' : 'Aucune pathologie diagnostiquée enregistrée pour ce patient.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {diagnostics.map((diag) => (
                          <div key={diag.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black text-slate-800">{diag.disease_name}</h4>
                                <p className="text-[11px] text-slate-400 font-semibold">{diag.category || 'Général'} · {diag.doctor_name}</p>
                              </div>
                              <span className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase',
                                diag.severity === 'simple' ? 'bg-emerald-100 text-emerald-800' :
                                diag.severity === 'modere' ? 'bg-amber-100 text-amber-800' :
                                diag.severity === 'grave' ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                              )}>
                                {diag.severity === 'simple' ? '🟢 Simple' :
                                 diag.severity === 'modere' ? '🟡 Modéré' :
                                 diag.severity === 'grave' ? '🟠 Grave' : '🔴 Critique'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                              <span className="font-semibold text-slate-600">Statut :</span>
                              <span className="font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px]">
                                {diag.evolution_status === 'gueri' ? '✅ Guéri' :
                                 diag.evolution_status === 'en_traitement' ? '💊 En traitement' :
                                 diag.evolution_status === 'en_observation' ? '🏥 En observation' :
                                 diag.evolution_status === 'transfere' ? '🚑 Transféré' : '🔄 Chronique'}
                              </span>
                            </div>

                            {diag.treatment_prescribed && (
                              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-950 text-xs">
                                <p className="font-bold text-[10px] uppercase text-teal-800">Traitement prescrit :</p>
                                <p className="mt-0.5">{diag.treatment_prescribed}</p>
                              </div>
                            )}

                            {diag.notes && (
                              <p className="text-xs text-slate-500 italic">« {diag.notes} »</p>
                            )}

                            <div className="text-[10px] text-slate-400 text-right">
                              {new Date(diag.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* TAB 1: IDENTITÉ */}
                {activeTab === 'identity' && (
                  <div className="space-y-4">
                    {/* Arrivée & Admission */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-600" /> Informations d'Arrivée & Motif
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold">Date & heure d'arrivée</span>
                          <span className="font-extrabold text-slate-800 mt-0.5 block">
                            {patient.arrival_time || patient.arrival_at
                              ? new Date(patient.arrival_time || patient.arrival_at!).toLocaleString('fr-FR')
                              : 'Non précisé'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">État clinique</span>
                          <div className="mt-1">
                            <StatusBadge status={patient.arrival_status || 'stable'} />
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Motif de consultation</span>
                          <span className="font-extrabold text-slate-800 mt-0.5 block">{patient.visit_reason || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Antécédents & Allergies */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" /> Antécédents Médicaux & Allergies
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200">
                          <span className="text-red-700 font-black block mb-1">Allergies connues</span>
                          <p className="text-slate-800 font-bold">{patient.allergies || 'Aucune allergie signalée'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="text-slate-600 font-black block mb-1">Groupe Sanguin</span>
                          <p className="text-slate-900 font-black text-sm">{patient.blood || 'Non spécifié'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Accompagnant si présent */}
                    {patient.is_accompanied && (
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" /> Proche Accompagnant
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block font-semibold">Nom & Prénom</span>
                            <span className="font-extrabold text-slate-800 mt-0.5 block">
                              {patient.accompanier_first_name} {patient.accompanier_last_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Lien de parenté</span>
                            <span className="font-extrabold text-slate-800 mt-0.5 block">
                              {patient.accompanier_relationship || 'Proche'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Téléphone</span>
                            <span className="font-mono font-extrabold text-slate-800 mt-0.5 block">
                              {patient.accompanier_phone || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: FACTURES DE SOINS */}
                {activeTab === 'care-bills' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">Factures des Actes & Soins Infirmiers</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">Historique des actes dispensés et état des règlements</p>
                      </div>
                      {unpaidTotal > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-rose-600 font-extrabold">Reste à Payer</p>
                          <p className="font-black text-rose-700 text-xl font-mono">{unpaidTotal} FCFA</p>
                        </div>
                      )}
                    </div>

                    {careBills.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        Aucune prestation de soin enregistrée pour ce dossier.
                      </div>
                    ) : (
                      careBills.map((bill) => (
                        <div
                          key={bill.id}
                          className={cn(
                            'p-4 sm:p-5 rounded-3xl border flex items-center justify-between text-xs space-y-1 transition-all shadow-xs',
                            bill.status === 'en_attente'
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : 'bg-white border-slate-200 text-slate-800'
                          )}
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-black text-sm">{bill.care_title}</span>
                              <span className={cn(
                                'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                                bill.status === 'en_attente' ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-800'
                              )}>
                                {bill.status === 'en_attente' ? '⚠️ NON PAYÉE' : '✅ PAYÉE'}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-75 mt-1 font-medium">
                              Date : {new Date(bill.created_at).toLocaleString('fr-FR')} | Quantité : {bill.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-base font-mono">{bill.total_price} FCFA</p>
                            <p className="text-[10px] opacity-75 font-mono">{bill.unit_price} FCFA / u</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: CONSTANTES */}
                {activeTab === 'vitals' && (
                  <div className="space-y-4">
                    {vitals.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        Aucune constante vitale enregistrée pour ce patient.
                      </div>
                    ) : (
                      vitals.map((v) => (
                        <div key={v.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-100 pb-2.5 font-semibold">
                            <span>Prise enregistrée le : {new Date(v.created_at).toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                            <div className="bg-blue-50/80 p-3 rounded-2xl text-center border border-blue-100">
                              <span className="text-slate-500 block font-semibold text-[11px]">Tension</span>
                              <span className="font-black text-blue-700 text-sm mt-0.5 block">{v.tension || '-'}</span>
                            </div>
                            <div className="bg-orange-50/80 p-3 rounded-2xl text-center border border-orange-100">
                              <span className="text-slate-500 block font-semibold text-[11px]">Température</span>
                              <span className="font-black text-orange-700 text-sm mt-0.5 block">{v.temp ? `${v.temp} °C` : '-'}</span>
                            </div>
                            <div className="bg-emerald-50/80 p-3 rounded-2xl text-center border border-emerald-100">
                              <span className="text-slate-500 block font-semibold text-[11px]">Pouls</span>
                              <span className="font-black text-emerald-700 text-sm mt-0.5 block">{v.pouls ? `${v.pouls} bpm` : '-'}</span>
                            </div>
                            <div className="bg-purple-50/80 p-3 rounded-2xl text-center border border-purple-100">
                              <span className="text-slate-500 block font-semibold text-[11px]">Poids</span>
                              <span className="font-black text-purple-700 text-sm mt-0.5 block">{v.poids ? `${v.poids} kg` : '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 4: RENDEZ-VOUS */}
                {activeTab === 'appointments' && (
                  <div className="space-y-3">
                    {appointments.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        Aucun rendez-vous planifié pour ce patient.
                      </div>
                    ) : (
                      appointments.map((a) => (
                        <div key={a.id} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                          <div>
                            <p className="font-black text-slate-900 text-sm">{a.doctor_name}</p>
                            <p className="text-slate-500 mt-1 font-medium">
                              📅 {new Date(a.appointment_date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 5: ORDONNANCES */}
                {activeTab === 'prescriptions' && (
                  <div className="space-y-4">
                    {prescriptions.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        Aucune ordonnance rédigée pour ce patient.
                      </div>
                    ) : (
                      prescriptions.map((p) => (
                        <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 text-xs">
                            <div>
                              <span className="font-black text-slate-900 text-sm">{p.doctor_name}</span>
                              <span className="text-slate-400 ml-2 font-medium">
                                {new Date(p.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                          <div className="space-y-2">
                            {p.items?.map((item, idx) => (
                              <div key={idx} className="bg-slate-50 p-2.5 rounded-xl text-xs flex justify-between border border-slate-100">
                                <span className="font-extrabold text-slate-800">{item.medicament} ({item.dosage})</span>
                                <span className="text-slate-500 font-medium">{item.frequence} - {item.duree}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 6: ANALYSES ET FICHIERS JOINTS */}
                {activeTab === 'labs' && (
                  <div className="space-y-4">
                    {labs.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        Aucune analyse biologique enregistrée.
                      </div>
                    ) : (
                      labs.map((l) => (
                        <div key={l.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900 text-sm">{l.test_name}</span>
                            <StatusBadge status={l.status} />
                          </div>
                          <p className="text-slate-500 font-medium">Prescrit par : <strong className="text-slate-700">{l.requested_by}</strong></p>
                          {l.results_text && (
                            <div className="p-3.5 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-100 font-mono text-xs">
                              <strong>Résultats :</strong> {l.results_text}
                            </div>
                          )}
                          {l.file_url && (
                            <div className="pt-2 flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setPreviewFile({ url: l.file_url!, name: l.file_name || 'Rapport', type: l.file_type || '' })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-100 text-purple-900 rounded-xl text-xs font-black hover:bg-purple-200 transition-all cursor-pointer shadow-xs"
                              >
                                <ZoomIn className="w-3.5 h-3.5 text-purple-700" />
                                Consulter le Rapport (PDF / Image)
                              </button>
                              <a
                                href={l.file_url}
                                download={l.file_name || 'rapport'}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Télécharger
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODALE DE PAIEMENT DIRECT DU REÇU / CAISSE ───────────────────────── */}
      {showDirectPaymentModal && patient && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 animate-fade-in p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Règlement Caisse — {patient.first_name} {patient.last_name || patient.name}</h3>
                    <p className="text-[11px] text-blue-200">{unpaidBills.length} soin(s) / acte(s) à encaisser</p>
                  </div>
                </div>
                <button onClick={() => setShowDirectPaymentModal(false)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                  <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] block">Détail des soins facturés</span>
                  {unpaidBills.map(b => (
                    <div key={b.id} className="flex justify-between items-center text-slate-700">
                      <span>{b.care_title} (x{b.quantity})</span>
                      <span className="font-mono font-bold">{b.total_price.toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
                  <span className="font-black text-emerald-950 text-sm">TOTAL À ENCAISSER</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">{unpaidTotal.toLocaleString()} FCFA</span>
                </div>

                {/* Mode de paiement */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mode de Paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="especes">💵 Espèces (Cash)</option>
                    <option value="wave">📲 Wave</option>
                    <option value="orange_money">🍊 Orange Money</option>
                    <option value="carte">💳 Carte Bancaire</option>
                    <option value="virement">🏦 Virement Bancaire</option>
                    <option value="moov">📱 Moov Money</option>
                    <option value="mtn">🟡 MTN Mobile Money</option>
                  </select>
                </div>

                {/* Montant remis & Monnaie */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Montant Remis (Client)</label>
                    <input
                      type="number"
                      placeholder={unpaidTotal.toString()}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Monnaie à Rendre</label>
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-black text-emerald-700">
                      {Math.max(0, (Number(cashReceived) || unpaidTotal) - unpaidTotal).toLocaleString()} FCFA
                    </div>
                  </div>
                </div>

                {/* Validation Button */}
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleProcessDirectPayment}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <ReceiptText className="w-4 h-4" />
                  {isProcessingPayment ? 'Validation en cours...' : `Encaisser & Imprimer le Reçu (${unpaidTotal.toLocaleString()} FCFA)`}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Reçu Imprimable */}
      {activeReceiptData && (
        <Receipt
          receipt={activeReceiptData}
          onClose={() => setActiveReceiptData(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* File Preview Lightbox */}
      {previewFile && (
        <FileLightbox file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </ModalPortal>
  );
}
