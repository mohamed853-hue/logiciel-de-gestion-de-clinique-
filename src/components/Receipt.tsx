import { useRef } from 'react';
import { Button } from './Button';
import { Printer, Download, X } from 'lucide-react';

interface ReceiptProps {
  reference: string;
  patientName: string;
  patientId?: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  cashierName: string;
  onClose?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

export function Receipt({
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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'card': return 'Carte bancaire';
      case 'transfer': return 'Virement';
      default: return method;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Reçu</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6">
          {/* Logo and Clinic Info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-white shadow-lg mb-3 overflow-hidden">
              <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">AL SHIFA</h1>
            <p className="text-slate-500">Clinique Médicale</p>
          </div>

          {/* Receipt Info */}
          <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">N° Reçu:</span>
              <span className="font-medium">{reference}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium">{new Date(date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Patient:</span>
              <span className="font-medium">{patientName}</span>
            </div>
            {patientId && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID Patient:</span>
                <span className="font-medium">{patientId}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-600">Description
                  </th>
                  <th className="text-right py-2 text-slate-600">Qté</th>
                  <th className="text-right py-2 text-slate-600">Prix</th>
                  <th className="text-right py-2 text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">{item.description}</td>
                    <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">{item.unitPrice} DH</td>
                    <td className="py-2 text-right text-slate-800 font-medium">{item.subtotal} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total:</span>
              <span className="font-medium">{subtotal} DH</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Remise:</span>
                <span className="font-medium">-{discount} DH</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Taxe:</span>
                <span className="font-medium">{tax} DH</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
              <span>Total:</span>
              <span className="text-blue-600">{total} DH</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Payé:</span>
              <span className="font-medium">{paidAmount} DH</span>
            </div>
            {paidAmount < total && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Reste:</span>
                <span className="font-medium">{total - paidAmount} DH</span>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="border-t border-dashed border-slate-300 pt-4 mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Mode de paiement:</span>
              <span className="font-medium">{getPaymentMethodLabel(paymentMethod)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Caissier:</span>
              <span className="font-medium">{cashierName}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400">Merci de votre confiance</p>
            <p className="text-xs text-slate-400 mt-1">Al Shifa - Clinique Médicale</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button variant="outline" className="flex-1" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant simplifié pour l'aperçu d'un reçu dans une liste
 */
export function ReceiptCard({ receipt }: { receipt: any }) {
  return (
    <div className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-800">{receipt.reference}</span>
        <span className="text-sm text-slate-500">{new Date(receipt.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Montant:</span>
        <span className="font-semibold text-blue-600">{receipt.amount} DH</span>
      </div>
    </div>
  );
}
