import { useRef } from 'react';
import { ModalPortal } from './ModalShell';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import { getClinicSettings } from '../services/clinicSettingsService';

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal?: number;
  totalPrice?: number;
}

export interface ReceiptData {
  reference?: string;
  number?: string;
  patientName?: string;
  patientId?: string;
  date?: string;
  items?: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paidAmount?: number;
  paymentMethod?: string;
  cashierName?: string;
  issuedBy?: string;
  type?: string;
}

export interface ReceiptProps {
  receipt?: ReceiptData;
  reference?: string;
  patientName?: string;
  patientId?: string;
  date?: string;
  items?: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paidAmount?: number;
  paymentMethod?: string;
  cashierName?: string;
  onClose?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

export function Receipt({
  receipt,
  reference,
  patientName,
  patientId,
  date,
  items,
  subtotal,
  discount,
  tax,
  total,
  paidAmount,
  paymentMethod,
  cashierName,
  onClose,
  onPrint,
  onDownload
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const clinicSettings = getClinicSettings();

  const displayRef = receipt?.reference || receipt?.number || reference || `REC-${Date.now().toString().slice(-6)}`;
  const displayPatientName = receipt?.patientName || patientName || 'Client Comptoir';
  const displayPatientId = receipt?.patientId || patientId;
  const rawDate = receipt?.date || date || new Date().toISOString();
  
  const formatDateDisplay = (d: string) => {
    if (!d) return '';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : parsed.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const displayDate = formatDateDisplay(rawDate);

  const rawItems = receipt?.items || items || [];
  const displayItems = rawItems.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount ?? 0,
    subtotal: item.subtotal ?? item.totalPrice ?? (item.quantity * item.unitPrice)
  }));

  const displaySubtotal = receipt?.subtotal ?? subtotal ?? 0;
  const displayDiscount = receipt?.discount ?? discount ?? 0;
  const displayTax = receipt?.tax ?? tax ?? 0;
  const displayTotal = receipt?.total ?? total ?? 0;
  const displayPaidAmount = receipt?.paidAmount ?? paidAmount ?? displayTotal;
  const displayPaymentMethod = receipt?.paymentMethod || paymentMethod || 'Espèces';
  const displayCashierName = receipt?.cashierName || receipt?.issuedBy || cashierName || 'Caisse Centrale Al Shifa';

  const fullLocation = [
    clinicSettings.clinicAddress,
    clinicSettings.city,
    clinicSettings.country,
  ].filter(Boolean).join(' · ') || 'Centre Médical & Chirurgical';

  const handleNativePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }

    const receiptElem = receiptRef.current;
    if (!receiptElem) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Reçu - ${displayRef}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              width: 80mm;
              margin: 0 auto;
              padding: 10px 8px;
              color: #000;
              background: #fff;
              font-size: 11px;
              line-height: 1.35;
            }
            .header-box { text-align: center; margin-bottom: 8px; }
            .logo-img { max-width: 55px; max-height: 55px; object-fit: contain; margin-bottom: 4px; }
            .clinic-title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .clinic-subtitle { font-size: 9.5px; color: #444; margin: 2px 0; font-weight: 600; }
            .clinic-phone { font-size: 9px; font-family: monospace; color: #555; }
            .badge-box {
              border: 1.5px solid #059669;
              background: #ecfdf5;
              color: #065f46;
              padding: 4px;
              border-radius: 6px;
              text-align: center;
              font-weight: 800;
              font-size: 9.5px;
              margin: 8px 0;
              text-transform: uppercase;
            }
            .dashed-sep { border-top: 1px dashed #777; margin: 6px 0; }
            .info-row { display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 2px; }
            .info-label { color: #555; font-weight: 600; }
            .info-val { font-weight: bold; }
            .tx-ref { font-family: monospace; font-weight: 900; color: #1d4ed8; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10.5px; }
            th { border-bottom: 1.5px solid #000; text-align: left; padding: 4px 2px; font-size: 9.5px; text-transform: uppercase; }
            td { padding: 4px 2px; border-bottom: 0.5px solid #e5e7eb; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 4px; }
            .footer-note { text-align: center; font-size: 8.5px; color: #666; margin-top: 8px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <img src="${clinicSettings.logoUrl || '/logo.jpg'}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
            <div class="clinic-title">${clinicSettings.clinicName || 'CLINIQUE MÉDICALE AL SHIFA'}</div>
            <div class="clinic-subtitle">${fullLocation}</div>
            <div class="clinic-phone">Tél: ${clinicSettings.clinicPhone || '+222 45 00 00 00'}</div>
          </div>

          <div class="badge-box">
            ✅ AUTORISATION DE SOINS / SORTIE : VALIDÉE
          </div>

          <div class="dashed-sep"></div>

          <div class="info-row">
            <span class="info-label">N° Transaction :</span>
            <span class="info-val tx-ref">${displayRef}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date :</span>
            <span class="info-val">${displayDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Patient(e) :</span>
            <span class="info-val">${displayPatientName}</span>
          </div>
          ${displayPatientId ? `
          <div class="info-row">
            <span class="info-label">Dossier :</span>
            <span class="info-val">#${displayPatientId}</span>
          </div>` : ''}
          <div class="info-row">
            <span class="info-label">Opérateur :</span>
            <span class="info-val">${displayCashierName}</span>
          </div>

          <div class="dashed-sep"></div>

          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th class="text-center">Qté</th>
                <th class="text-right">Total FCFA</th>
              </tr>
            </thead>
            <tbody>
              ${displayItems.map(item => `
                <tr>
                  <td><strong>${item.description}</strong></td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right"><strong>${item.subtotal.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="dashed-sep"></div>

          <div class="info-row">
            <span>Sous-total Brut :</span>
            <span>${displaySubtotal.toLocaleString()} FCFA</span>
          </div>
          ${displayDiscount > 0 ? `
          <div class="info-row" style="color: #059669; font-weight: bold;">
            <span>Prise en charge / Remise :</span>
            <span>-${displayDiscount.toLocaleString()} FCFA</span>
          </div>` : ''}
          <div class="total-row">
            <span>NET PAYÉ :</span>
            <span style="color: #047857;">${displayTotal.toLocaleString()} FCFA</span>
          </div>
          <div class="info-row" style="margin-top: 4px;">
            <span>Règlement :</span>
            <span><strong>${getPaymentMethodLabel(displayPaymentMethod)}</strong></span>
          </div>

          <div class="dashed-sep"></div>

          <div class="footer-note">
            ${clinicSettings.receiptFooterNote || 'Merci de votre confiance. Bon rétablissement avec l\'aide d\'Allah.'}<br/>
            <span style="font-size: 8px; color: #999;">Clinique Al Shifa · Système Intégré</span>
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
    } else {
      window.print();
    }
  };

  const handleExportPDF = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    handleNativePrint();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': case 'Espèces': return 'Espèces (Cash)';
      case 'card': case 'Carte': return 'Carte Bancaire';
      case 'transfer': case 'Virement': return 'Virement';
      default: return method;
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[1200] p-3 sm:p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-in my-auto" onClick={e => e.stopPropagation()}>
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Reçu Officiel de Caisse</h2>
                <p className="text-[10px] text-emerald-700 font-bold">Paiement Validé & Autorisé</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNativePrint}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105"
                title="Imprimer le Reçu"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
              {onClose && (
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Printable Ticket Area */}
          <div ref={receiptRef} id="printable-receipt-card" className="p-6 overflow-y-auto bg-white text-slate-900 font-sans space-y-4">
            {/* Logo & Clinic Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-1 overflow-hidden border border-slate-200 p-1">
                <img
                  src={clinicSettings.logoUrl || '/logo.jpg'}
                  alt="Al Shifa"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as any).src = '/logo.jpg'; }}
                />
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                {clinicSettings.clinicName || 'CLINIQUE AL SHIFA'}
              </h1>
              <p className="text-[11px] text-slate-500 font-semibold">{fullLocation}</p>
              <p className="text-[10px] text-slate-400 font-mono">Tél: {clinicSettings.clinicPhone || '+222 45 00 00 00'}</p>
            </div>

            {/* Badge de validation */}
            <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-center space-y-0.5 shadow-xs">
              <span className="text-xs font-black uppercase tracking-wider block">
                ✅ AUTORISATION DE SOINS / SORTIE : VALIDÉE
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                Ce reçu certifie le règlement intégral des prestations ci-dessous.
              </span>
            </div>

            {/* Receipt Info */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">N° Transaction :</span>
                <span className="font-mono font-black text-blue-700">{displayRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Date & Heure :</span>
                <span className="font-semibold">{displayDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Patient(e) :</span>
                <span className="font-black text-slate-900">{displayPatientName}</span>
              </div>
              {displayPatientId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Dossier Médical :</span>
                  <span className="font-mono font-bold text-slate-700">#{displayPatientId}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Opérateur Caisse :</span>
                <span>{displayCashierName}</span>
              </div>
            </div>

            {/* Table des prestations */}
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                    <th className="py-2 text-left">Désignation</th>
                    <th className="py-2 text-center w-12">Qté</th>
                    <th className="py-2 text-right w-20">Prix Unitaire</th>
                    <th className="py-2 text-right w-24">Total (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 pr-2 font-bold text-[11px] leading-tight">{item.description}</td>
                      <td className="py-2 text-center text-slate-600 font-semibold font-mono">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-600 font-mono text-[11px]">{item.unitPrice.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono font-black text-slate-900">{item.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="border-t-2 border-dashed border-slate-300 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total Brut :</span>
                <span className="font-mono font-semibold">{displaySubtotal.toLocaleString()} FCFA</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Prise en charge / Remise :</span>
                  <span className="font-mono">-{displayDiscount.toLocaleString()} FCFA</span>
                </div>
              )}
              {displayTax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Taxe :</span>
                  <span className="font-mono">{displayTax.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t border-slate-300 pt-2 text-slate-950">
                <span>NET PAYÉ :</span>
                <span className="font-mono text-emerald-700">{displayTotal.toLocaleString()} FCFA</span>
              </div>
              {displayPaidAmount > displayTotal && (
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Espèces Remises :</span>
                  <span>{displayPaidAmount.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                <span>Mode de Règlement :</span>
                <span className="font-bold text-slate-900">{getPaymentMethodLabel(displayPaymentMethod)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-3 border-t border-slate-200 text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-medium italic">
                {clinicSettings.receiptFooterNote || 'Merci de votre confiance. Bon rétablissement avec l\'aide d\'Allah.'}
              </p>
              <div className="text-[9px] font-mono text-slate-400">
                Clinique Al Shifa · Système de Gestion Intégré
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter en PDF
            </button>
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer le Reçu
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
