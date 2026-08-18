import { useRef } from 'react';
import { ModalPortal } from './ModalShell';
import { Printer, X, FlaskConical, ShieldCheck } from 'lucide-react';
import { getClinicSettings } from '../services/clinicSettingsService';
import type { LabTest } from '../types';


interface LabReportModalProps {
  test: LabTest;
  onClose: () => void;
}

export function LabReportModal({ test, onClose }: LabReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const clinicSettings = getClinicSettings();

  const patientName = test.patient
    ? `${test.patient.first_name} ${test.patient.last_name || test.patient.name}`
    : 'Patient non spécifié';

  const fullLocation = [
    clinicSettings.clinicAddress,
    clinicSettings.city,
    clinicSettings.country,
  ].filter(Boolean).join(' · ') || 'Centre Médical & Chirurgical';

  const structuredResults = test.structured_results || [];

  const handlePrint = () => {
    const reportElem = reportRef.current;
    if (!reportElem) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Compte-Rendu Laboratoire - ${test.test_name} - ${patientName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 12mm 15mm 12mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              background: #fff;
              font-size: 12px;
              line-height: 1.4;
              padding: 0;
              margin: 0;
            }
            .header-table { width: 100%; border-bottom: 2.5px solid #7c3aed; padding-bottom: 12px; margin-bottom: 14px; }
            .clinic-logo { max-width: 65px; max-height: 65px; object-fit: contain; }
            .clinic-name { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #4c1d95; margin: 0; }
            .clinic-sub { font-size: 10px; color: #64748b; font-weight: 600; margin: 2px 0; }
            
            .report-title-box {
              background: #f5f3ff;
              border: 1.5px solid #ddd6fe;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
              margin-bottom: 14px;
            }
            .report-title { font-size: 14px; font-weight: 900; color: #5b21b6; text-transform: uppercase; margin: 0; }
            .report-sub { font-size: 10px; color: #6b21a8; font-weight: 700; margin-top: 2px; }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
              font-size: 11px;
            }
            .info-row { margin-bottom: 3px; }
            .info-label { color: #64748b; font-weight: 600; }
            .info-val { font-weight: bold; color: #0f172a; }

            table.results-table {
              width: 100%;
              border-collapse: collapse;
              margin: 14px 0;
              font-size: 11.5px;
            }
            table.results-table th {
              background: #f1f5f9;
              border-top: 1.5px solid #cbd5e1;
              border-bottom: 1.5px solid #cbd5e1;
              padding: 6px 8px;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              color: #475569;
              font-weight: 800;
            }
            table.results-table td {
              padding: 6px 8px;
              border-bottom: 1px solid #f1f5f9;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .val-abnormal { color: #dc2626; font-weight: 900; }
            .val-normal { color: #059669; font-weight: 700; }
            .badge-abnormal { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9px; }
            .badge-normal { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9px; }

            .obs-box {
              background: #f8fafc;
              border-left: 4px solid #7c3aed;
              padding: 8px 12px;
              margin: 14px 0;
              font-size: 11px;
            }
            .obs-title { font-weight: 800; color: #4c1d95; margin-bottom: 2px; text-transform: uppercase; font-size: 10px; }

            .footer-sign-table {
              width: 100%;
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px dashed #cbd5e1;
            }
            .sign-box {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              background: #faf5ff;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 70px; vertical-align: middle;">
                <img src="${clinicSettings.logoUrl || '/logo.jpg'}" class="clinic-logo" alt="Logo" onerror="this.style.display='none'" />
              </td>
              <td style="vertical-align: middle;">
                <div class="clinic-name">${clinicSettings.clinicName || 'CLINIQUE MÉDICALE AL SHIFA'}</div>
                <div class="clinic-sub">Laboratoire d'Analyses Médicales & Biologie Clinique</div>
                <div class="clinic-sub">${fullLocation} · Tél: ${clinicSettings.clinicPhone || '+222 45 00 00 00'}</div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="font-family: monospace; font-weight: 800; color: #7c3aed; font-size: 12px;">BULLETIN N° ${test.id.slice(0, 8).toUpperCase()}</div>
                <div style="font-size: 10px; color: #64748b;">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
              </td>
            </tr>
          </table>

          <div class="report-title-box">
            <div class="report-title">COMPTE-RENDU D'ANALYSES BIOMÉDICALES</div>
            <div class="report-sub">${test.test_name}</div>
          </div>

          <div class="info-grid">
            <div>
              <div class="info-row"><span class="info-label">Patient(e) :</span> <span class="info-val">${patientName}</span></div>
              <div class="info-row"><span class="info-label">Âge / Sexe :</span> <span class="info-val">${test.patient?.age ? `${test.patient.age} ans` : '-'} / ${test.patient?.sex === 'F' ? 'Féminin' : 'Masculin'}</span></div>
              <div class="info-row"><span class="info-label">Groupe Sanguin :</span> <span class="info-val">${test.patient?.blood || 'N/R'}</span></div>
              ${test.gestational_age_sa ? `<div class="info-row"><span class="info-label">Terme de Grossesse :</span> <span class="info-val" style="color: #db2777;">${test.gestational_age_sa}</span></div>` : ''}
            </div>
            <div>
              <div class="info-row"><span class="info-label">Prescripteur :</span> <span class="info-val">${test.requested_by}</span></div>
              <div class="info-row"><span class="info-label">Indication Clinique :</span> <span class="info-val">${test.clinical_indication || 'Bilan de routine'}</span></div>
              <div class="info-row"><span class="info-label">Prélèvement :</span> <span class="info-val">${test.sample_type || 'Sang veineux'} (${test.patient_fasting ? 'À jeun' : 'Non à jeun'})</span></div>
              <div class="info-row"><span class="info-label">Date Validation :</span> <span class="info-val">${test.validated_at ? new Date(test.validated_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span></div>
            </div>
          </div>

          ${structuredResults.length > 0 ? `
          <table class="results-table">
            <thead>
              <tr>
                <th>Paramètre Analysé</th>
                <th class="text-center">Résultat Mesuré</th>
                <th class="text-center">Unités</th>
                <th class="text-center">Valeurs de Référence</th>
                <th class="text-right">Interprétation</th>
              </tr>
            </thead>
            <tbody>
              ${structuredResults.map(p => {
                const isAbnormal = p.status === 'high' || p.status === 'low' || p.status === 'critical' || p.status === 'positive';
                return `
                <tr>
                  <td><strong>${p.param_name}</strong></td>
                  <td class="text-center ${isAbnormal ? 'val-abnormal' : 'val-normal'}">
                    <strong>${p.value}</strong>
                  </td>
                  <td class="text-center" style="color: #64748b; font-size: 10.5px;">${p.unit || '-'}</td>
                  <td class="text-center" style="color: #475569; font-size: 10.5px;">${p.reference_range || '-'}</td>
                  <td class="text-right">
                    <span class="${isAbnormal ? 'badge-abnormal' : 'badge-normal'}">
                      ${isAbnormal ? (p.status === 'high' ? '▲ ÉLEVÉ' : p.status === 'low' ? '▼ BAS' : 'ANORMAL') : '✓ NORMAL'}
                    </span>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          ` : ''}

          ${test.results_text ? `
          <div class="obs-box">
            <div class="obs-title">Observations &amp; Conclusion du Biologiste :</div>
            <div>${test.results_text.replace(/\n/g, '<br/>')}</div>
          </div>
          ` : ''}

          ${test.remarks ? `
          <div class="obs-box" style="border-left-color: #0d9488;">
            <div class="obs-title" style="color: #0f766e;">Remarques Techniques &amp; Conditions d'Analyse :</div>
            <div>${test.remarks}</div>
          </div>
          ` : ''}

          <table class="footer-sign-table">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <div style="font-size: 9.5px; color: #64748b;">
                  * Ce compte-rendu d'analyse biologique est strictement confidentiel.<br/>
                  Validé électroniquement par le système hospitalier Al Shifa.
                </div>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <div class="sign-box">
                  <div style="font-size: 10px; font-weight: 800; color: #6b21a8; text-transform: uppercase;">Biologiste Responsable du Laboratoire</div>
                  <div style="font-size: 11px; font-weight: 900; color: #1e1b4b; margin: 4px 0;">${test.validated_by || 'Dr. Laboratoire Al Shifa'}</div>
                  <div style="font-size: 9px; color: #059669; font-weight: 700;">✅ SIGNATURE ÉLECTRONIQUE VALIDÉE</div>
                </div>
              </td>
            </tr>
          </table>

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

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center z-[1300] p-3 sm:p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-in my-auto" onClick={e => e.stopPropagation()}>
          
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/90 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bulletin d'Analyses Médicales</h2>
                <p className="text-[10px] text-purple-700 font-bold">Laboratoire de Biologie Clinique</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer A4
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Document Preview */}
          <div ref={reportRef} className="p-6 overflow-y-auto bg-white text-slate-900 font-sans space-y-4 text-xs">
            {/* Header Clinic */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-purple-600 gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3">
                <img
                  src={clinicSettings.logoUrl || '/logo.jpg'}
                  alt="Logo"
                  className="w-12 h-12 object-contain"
                  onError={(e) => { (e.target as any).src = '/logo.jpg'; }}
                />
                <div>
                  <h1 className="text-sm font-black text-purple-950 uppercase">{clinicSettings.clinicName || 'CLINIQUE AL SHIFA'}</h1>
                  <p className="text-[10px] text-slate-500 font-semibold">{fullLocation}</p>
                  <p className="text-[9.5px] text-slate-400 font-mono">Tél: {clinicSettings.clinicPhone || '+222 45 00 00 00'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 block">
                  REF: {test.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Validé le {new Date(test.validated_at || test.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {/* Titre examen */}
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-2xl text-center">
              <h3 className="text-xs font-black uppercase text-purple-950">{test.test_name}</h3>
              {test.clinical_indication && (
                <p className="text-[10px] text-purple-700 font-bold mt-0.5">Indication : {test.clinical_indication}</p>
              )}
            </div>

            {/* Info Patient & Prescripteur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div><span className="text-slate-500 font-semibold">Patient(e) :</span> <strong className="text-slate-900">{patientName}</strong></div>
                <div><span className="text-slate-500 font-semibold">Âge / Sexe :</span> <strong>{test.patient?.age ? `${test.patient.age} ans` : '-'} / {test.patient?.sex === 'F' ? 'Féminin' : 'Masculin'}</strong></div>
                <div><span className="text-slate-500 font-semibold">Groupe Sanguin :</span> <strong className="text-red-700">{test.patient?.blood || 'Non Renseigné'}</strong></div>
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500 font-semibold">Praticien :</span> <strong className="text-slate-900">{test.requested_by}</strong></div>
                <div><span className="text-slate-500 font-semibold">Prélèvement :</span> <strong>{test.sample_type || 'Sang veineux'} ({test.patient_fasting ? 'À jeun' : 'Non à jeun'})</strong></div>
                {test.gestational_age_sa && (
                  <div><span className="text-slate-500 font-semibold">Terme Grossesse :</span> <strong className="text-pink-700 font-black">{test.gestational_age_sa}</strong></div>
                )}
              </div>
            </div>

            {/* Table des Paramètres Structurés */}
            {structuredResults.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[9.5px] border-b">
                      <th className="py-2 px-3 text-left">Paramètre</th>
                      <th className="py-2 px-2 text-center">Valeur Mesurée</th>
                      <th className="py-2 px-2 text-center">Unités</th>
                      <th className="py-2 px-2 text-center">Intervalles de Référence</th>
                      <th className="py-2 px-3 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {structuredResults.map((p, idx) => {
                      const isAbnormal = p.status === 'high' || p.status === 'low' || p.status === 'critical' || p.status === 'positive';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">{p.param_name}</td>
                          <td className={`py-2 px-2 text-center font-mono font-black ${isAbnormal ? 'text-red-600 text-sm' : 'text-emerald-700'}`}>
                            {p.value}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-500 font-mono text-[10px]">{p.unit || '-'}</td>
                          <td className="py-2 px-2 text-center text-slate-600 font-mono text-[10.5px]">{p.reference_range || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black ${isAbnormal ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {isAbnormal ? (p.status === 'high' ? '▲ ÉLEVÉ' : p.status === 'low' ? '▼ BAS' : 'ANORMAL') : '✓ NORMAL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Observations textuelles */}
            {test.results_text && (
              <div className="p-3 bg-emerald-50/70 border-l-4 border-emerald-500 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-900 block">Conclusion / Observations du Biologiste :</span>
                <p className="text-emerald-950 font-medium whitespace-pre-wrap">{test.results_text}</p>
              </div>
            )}

            {/* Remarques internes */}
            {test.remarks && (
              <div className="p-3 bg-slate-50 border-l-4 border-teal-500 rounded-xl space-y-0.5">
                <span className="text-[10px] font-black uppercase text-teal-900 block">Remarques Techniques :</span>
                <p className="text-slate-700 font-medium">{test.remarks}</p>
              </div>
            )}

            {/* Signature Box */}
            <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center flex-wrap gap-3">
              <div className="text-[9.5px] text-slate-400 space-y-0.5">
                <p className="font-semibold text-slate-600">Système Intégré de Biologie Médicale Al Shifa</p>
                <p>Document officiel certifié et archivé au dossier patient.</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-center min-w-[200px]">
                <span className="text-[9px] font-bold text-purple-700 uppercase block">Validé par le Biologiste</span>
                <span className="text-xs font-black text-purple-950 block mt-0.5">{test.validated_by || 'Laborantin Responsable'}</span>
                <span className="text-[9px] font-bold text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3" /> Signature Électronique
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500 font-semibold">Format A4 Prêt à l'Impression</span>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer le Compte-Rendu
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
