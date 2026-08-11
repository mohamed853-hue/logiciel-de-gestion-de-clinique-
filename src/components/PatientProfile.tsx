import { useState, useEffect } from 'react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import {
  X, User, Phone, Calendar, Heart, FileText,
  FlaskConical, Activity, Clock, Pill, MapPin
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import type { Patient, Prescription, LabTest, VitalsRecord, Appointment } from '../types';

interface PatientProfileProps {
  patientId: string | null;
  onClose: () => void;
  onNewPrescription?: (patient: Patient) => void;
  onNewLabRequest?: (patient: Patient) => void;
}

type ProfileTab = 'identity' | 'vitals' | 'appointments' | 'prescriptions' | 'labs' | 'history';

export function PatientProfile({ patientId, onClose, onNewPrescription, onNewLabRequest }: PatientProfileProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');
  const [loading, setLoading] = useState(true);

  // Historique & sous-données
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [vitals, setVitals] = useState<VitalsRecord[]>([]);

  useEffect(() => {
    if (!patientId) return;
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [pRes, appRes, prescRes, labRes, vitRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('lab_tests').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('vitals_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      ]);

      if (pRes.data) setPatient(pRes.data);
      setAppointments(appRes.data || []);
      setPrescriptions((prescRes.data || []).map((p: any) => ({
        ...p,
        items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []),
      })));
      setLabs(labRes.data || []);
      setVitals(vitRes.data || []);
    } catch (err) {
      console.error('Error loading patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!patientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-slate-200">
        
        {/* Header Drawer */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {loading || !patient ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-48 bg-white/20 rounded" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-white/20">
                {patient.first_name?.[0]}{patient.last_name?.[0] || patient.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-white truncate">
                    {patient.first_name} {patient.last_name || patient.name}
                  </h2>
                  {patient.patient_number && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-xs text-blue-200 font-mono">
                      #{patient.patient_number}
                    </span>
                  )}
                  <StatusBadge status={patient.arrival_status || 'stable'} size="sm" />
                </div>

                <div className="flex items-center gap-4 text-xs text-blue-200 mt-2 flex-wrap">
                  {patient.age && <span>{patient.age} ans</span>}
                  {patient.sex && <span>Sexe : {patient.sex === 'M' ? 'Masculin' : 'Féminin'}</span>}
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {patient.phone}
                    </span>
                  )}
                  {patient.blood && (
                    <span className="px-2 py-0.5 rounded bg-red-500/30 text-red-200 font-bold">
                      {patient.blood}
                    </span>
                  )}
                </div>

                {patient.visit_reason && (
                  <p className="text-xs text-white/80 mt-2 font-medium bg-white/10 px-3 py-1 rounded-lg inline-block">
                    Motif de venue : {patient.visit_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          {patient && (
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
              {onNewPrescription && (
                <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white text-xs border-0" onClick={() => onNewPrescription(patient)}>
                  <Pill className="w-3.5 h-3.5 mr-1" /> Nouvelle Ordonnance
                </Button>
              )}
              {onNewLabRequest && (
                <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white text-xs border-0" onClick={() => onNewLabRequest(patient)}>
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Demander Analyse
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          {[
            { id: 'identity', label: 'Identité & Infos', icon: <User className="w-4 h-4" /> },
            { id: 'vitals', label: `Constantes (${vitals.length})`, icon: <Activity className="w-4 h-4" /> },
            { id: 'appointments', label: `RDV (${appointments.length})`, icon: <Calendar className="w-4 h-4" /> },
            { id: 'prescriptions', label: `Ordonnances (${prescriptions.length})`, icon: <FileText className="w-4 h-4" /> },
            { id: 'labs', label: `Analyses (${labs.length})`, icon: <FlaskConical className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ProfileTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all',
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Chargement du dossier patient...</div>
          ) : !patient ? (
            <div className="p-8 text-center text-slate-400">Patient introuvable</div>
          ) : (
            <>
              {/* TAB 1: IDENTITÉ */}
              {activeTab === 'identity' && (
                <div className="space-y-6">
                  {/* Arrivée & Admission */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" /> Informations d'Arrivée
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Date & heure d'arrivée</span>
                        <span className="font-semibold text-slate-700">
                          {patient.arrival_time || patient.arrival_at
                            ? new Date(patient.arrival_time || patient.arrival_at!).toLocaleString('fr-FR')
                            : 'Non précisé'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">État à l'arrivée</span>
                        <StatusBadge status={patient.arrival_status || 'stable'} />
                      </div>
                      <div>
                        <span className="text-slate-400 block">Motif de venue</span>
                        <span className="font-semibold text-slate-700">{patient.visit_reason || 'Non renseigné'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accompagnant */}
                  {patient.is_accompanied && (
                    <div className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-2">
                      <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-600" /> Patient Accompagné
                      </h3>
                      <p className="text-xs text-amber-800">
                        Accompagnant enregistré dans le système.
                      </p>
                    </div>
                  )}

                  {/* Informations Médicales Pertinentes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" /> Antécédents & Allergies
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                        <span className="text-red-600 font-bold block mb-1">Allergies connues</span>
                        <p className="text-slate-700">{patient.allergies || 'Aucune allergie signalée'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-bold block mb-1">Groupe Sanguin</span>
                        <p className="text-slate-800 font-bold">{patient.blood || 'Non spécifié'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Coordonnées */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-600" /> Coordonnées & Adresse
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Téléphone</span>
                        <span className="font-semibold text-slate-700">{patient.phone || 'Non renseigné'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ville & Pays</span>
                        <span className="font-semibold text-slate-700">{patient.city || '-'}, {patient.country || 'Algérie'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Adresse complète</span>
                        <span className="font-semibold text-slate-700">{patient.address || 'Non renseignée'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONSTANTES */}
              {activeTab === 'vitals' && (
                <div className="space-y-4">
                  {vitals.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Aucune constante vitale enregistrée pour ce patient.</div>
                  ) : (
                    vitals.map((v) => (
                      <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-center text-xs text-slate-400 border-b pb-2">
                          <span>Prise le : {new Date(v.created_at).toLocaleString('fr-FR')}</span>
                          {v.created_by && <span>Par : {v.created_by}</span>}
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-xs pt-1">
                          <div className="bg-blue-50 p-2 rounded-lg text-center">
                            <span className="text-slate-400 block">Tension</span>
                            <span className="font-bold text-blue-700">{v.tension || '-'}</span>
                          </div>
                          <div className="bg-orange-50 p-2 rounded-lg text-center">
                            <span className="text-slate-400 block">Température</span>
                            <span className="font-bold text-orange-700">{v.temp ? `${v.temp} °C` : '-'}</span>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg text-center">
                            <span className="text-slate-400 block">Pouls</span>
                            <span className="font-bold text-emerald-700">{v.pouls ? `${v.pouls} bpm` : '-'}</span>
                          </div>
                          <div className="bg-purple-50 p-2 rounded-lg text-center">
                            <span className="text-slate-400 block">Poids</span>
                            <span className="font-bold text-purple-700">{v.poids ? `${v.poids} kg` : '-'}</span>
                          </div>
                          <div className="bg-cyan-50 p-2 rounded-lg text-center">
                            <span className="text-slate-400 block">Sat. O2</span>
                            <span className="font-bold text-cyan-700">{v.saturation ? `${v.saturation} %` : '-'}</span>
                          </div>
                        </div>
                        {v.soins && (
                          <p className="text-xs text-slate-600 pt-1">
                            <strong className="text-slate-700">Soins dispensés :</strong> {v.soins}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: RENDEZ-VOUS */}
              {activeTab === 'appointments' && (
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Aucun rendez-vous trouvé.</div>
                  ) : (
                    appointments.map((a) => (
                      <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{a.doctor_name}</p>
                          <p className="text-slate-500 mt-0.5">
                            {new Date(a.appointment_date).toLocaleString('fr-FR')}
                          </p>
                          {a.notes && <p className="text-slate-400 mt-1 italic">{a.notes}</p>}
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: ORDONNANCES */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Aucune ordonnance rédigée.</div>
                  ) : (
                    prescriptions.map((p) => (
                      <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{p.doctor_name}</span>
                            <span className="text-slate-400 ml-2">
                              {new Date(p.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="space-y-1.5">
                          {p.items?.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-2 rounded-lg text-xs flex justify-between">
                              <span className="font-semibold text-slate-700">{item.medicament} ({item.dosage})</span>
                              <span className="text-slate-500">{item.frequence} - {item.duree}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: ANALYSES */}
              {activeTab === 'labs' && (
                <div className="space-y-3">
                  {labs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Aucune analyse biologique enregistrée.</div>
                  ) : (
                    labs.map((l) => (
                      <div key={l.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{l.test_name}</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="text-slate-400">Demandé par : {l.requested_by}</p>
                        {l.results_text && (
                          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100 font-mono mt-2">
                            <strong>Résultat :</strong> {l.results_text}
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
  );
}
