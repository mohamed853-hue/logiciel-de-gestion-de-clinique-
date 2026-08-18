import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, Stethoscope, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Patient, Appointment, AppointmentStatus } from '../types';
import {
  ModalShell,
  FormSection,
  FormField,
  ModalInput,
  ModalSelect,
  ModalTextarea,
  CancelButton,
  SubmitButton,
  ModalErrorAlert,
} from './ModalShell';
import { cn } from '../utils/cn';
import { useLanguage } from '../hooks/useLanguage';

interface DoctorOption {
  id: string;
  name: string;
  role: string;
  service?: string;
}

const DEFAULT_DOCTORS: DoctorOption[] = [
  { id: 'doc-1', name: 'Dr. Karim Benali', role: 'medecin', service: 'Médecine Générale' },
  { id: 'doc-2', name: 'Dr. Sarah Mansouri', role: 'gynecologue', service: 'Gynécologie-Obstétrique' },
  { id: 'doc-3', name: 'Dr. Amine Triki', role: 'medecin', service: 'Pédiatrie' },
  { id: 'doc-4', name: 'Dr. Yasmine Khelil', role: 'gynecologue', service: 'Suivi de Grossesse' },
];

const VISIT_TYPES = [
  { value: 'consultation', label: '🩺 Consultation Générale' },
  { value: 'suivi', label: '📋 Suivi Médical' },
  { value: 'controle', label: '🔍 Visite de Contrôle' },
  { value: 'urgence', label: '🚨 Consultation d\'Urgence' },
  { value: 'gyneco', label: '👶 Consultation Gynéco / Grossesse' },
  { value: 'analyse', label: '🔬 Bilan / Analyses' },
];

interface AppointmentModalProps {
  /** Patient pré-sélectionné (optionnel) */
  initialPatient?: Patient;
  /** Rendez-vous à modifier (optionnel, si fourni -> mode édition) */
  appointmentToEdit?: Appointment | null;
  /** Callback après création / modification réussie */
  onSuccess?: () => void;
  onClose: () => void;
}

export function AppointmentModal({
  initialPatient,
  appointmentToEdit,
  onSuccess,
  onClose,
}: AppointmentModalProps) {
  const isEditing = !!appointmentToEdit;
  const { t, isArabic } = useLanguage();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>(DEFAULT_DOCTORS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [patientId, setPatientId] = useState(appointmentToEdit?.patient_id || initialPatient?.id || '');
  const [doctorId, setDoctorId] = useState(appointmentToEdit?.doctor_id || '');
  const [doctorName, setDoctorName] = useState(appointmentToEdit?.doctor_name || '');
  const [appointmentDate, setAppointmentDate] = useState(
    appointmentToEdit?.appointment_date
      ? new Date(appointmentToEdit.appointment_date).toISOString().slice(0, 16)
      : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'emergency'>(
    appointmentToEdit?.priority || 'normal'
  );
  const [visitType, setVisitType] = useState(appointmentToEdit?.visit_type || 'consultation');
  const [notes, setNotes] = useState(appointmentToEdit?.notes || '');
  const [status, setStatus] = useState<AppointmentStatus>(appointmentToEdit?.status || 'planifie');

  // Load patients and doctors list
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients
        const pRes = await supabase.from('patients').select('*').order('first_name');
        if (pRes.data && pRes.data.length > 0) {
          setPatients(pRes.data);
          if (!patientId && !initialPatient) {
            setPatientId(pRes.data[0].id);
          }
        }

        // Fetch doctors
        const dRes = await supabase
          .from('app_users')
          .select('id, name, role, service')
          .in('role', ['medecin', 'gynecologue']);
        if (dRes.data && dRes.data.length > 0) {
          setDoctorsList(dRes.data);
          if (!doctorId && !doctorName) {
            setDoctorId(dRes.data[0].id);
            setDoctorName(dRes.data[0].name);
          }
        } else {
          if (!doctorName) {
            setDoctorId(DEFAULT_DOCTORS[0].id);
            setDoctorName(DEFAULT_DOCTORS[0].name);
          }
        }
      } catch (err) {
        console.error('Error fetching data for appointment modal:', err);
      }
    };
    fetchData();
  }, [patientId, initialPatient, doctorId, doctorName]);

  const selectedPatient = patients.find(p => p.id === patientId) || initialPatient;
  const patientDisplayName = selectedPatient
    ? `${selectedPatient.first_name} ${selectedPatient.last_name || selectedPatient.name}`
    : appointmentToEdit?.patient_name || 'Patient';

  const selectedDoctorObj = doctorsList.find(d => d.id === doctorId || d.name === doctorName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId && !selectedPatient) {
      setErrorMsg('Veuillez sélectionner un patient.');
      return;
    }
    if (!doctorName) {
      setErrorMsg('Veuillez choisir un médecin.');
      return;
    }
    if (!appointmentDate) {
      setErrorMsg('Veuillez spécifier la date et l\'heure.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        patient_id: patientId || selectedPatient?.id,
        patient_name: patientDisplayName,
        doctor_id: doctorId || null,
        doctor_name: doctorName,
        appointment_date: new Date(appointmentDate).toISOString(),
        priority,
        visit_type: visitType,
        notes: notes.trim() || null,
        status,
      };

      if (isEditing && appointmentToEdit?.id) {
        // Update
        const { error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', appointmentToEdit.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from('appointments').insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
        ]);
        if (error) throw error;

        // Trigger notification for the doctor
        try {
          await supabase.from('notifications').insert([
            {
              recipient_role: 'medecin',
              type: 'appointment',
              title: '📅 Nouveau Rendez-vous Planifié',
              message: `RDV pour ${patientDisplayName} le ${new Date(appointmentDate).toLocaleString('fr-FR')} avec ${doctorName}.`,
              is_read: false,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch { /* silent */ }
      }

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving appointment:', err);
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement du rendez-vous');
      setLoading(false);
    }
  };

  return (
    <ModalShell
      icon={<Calendar className="w-6 h-6 text-purple-300" />}
      title={isEditing ? 'Modifier le Rendez-vous' : 'Planifier un Rendez-vous Médical'}
      subtitle={isEditing ? `Mise à jour du dossier de ${patientDisplayName}` : 'Affectation directe au médecin & notification automatique'}
      color="purple"
      maxWidth="xl"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SubmitButton
            loading={loading}
            loadingText={isEditing ? 'Mise à jour en cours...' : 'Planification du RDV...'}
            color="purple"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isEditing ? 'Enregistrer les Modifications' : 'Confirmer & Planifier le RDV'}
          </SubmitButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <ModalErrorAlert message={errorMsg} />}

        {/* ─── BANNIÈRE RÉCAPITULATIVE EN DIRECT ──────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-purple-200/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              📅
            </div>
            <div>
              <p className="text-xs text-purple-900 font-extrabold">
                {patientDisplayName} · <span className="text-purple-600 font-semibold">{doctorName || 'Médecin sélectionné'}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Prévu le : <strong className="text-slate-800 font-mono">{appointmentDate ? new Date(appointmentDate).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date non définie'}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider',
              priority === 'emergency' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
              priority === 'urgent' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
              'bg-purple-100 text-purple-800 border border-purple-200'
            )}>
              {priority === 'emergency' ? '🚨 Urgence Vitale' : priority === 'urgent' ? '⚡ Urgent' : '✓ Normal'}
            </span>
          </div>
        </div>

        {/* ─── SECTION 1: PATIENT & PRATICIEN ─────────────────────────────────── */}
        <FormSection title="1. Patient & Praticien Référent" icon={<User className="w-4 h-4 text-purple-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sélection du patient */}
            <FormField label="Patient Concerné" required>
              {initialPatient ? (
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black">
                      {initialPatient.first_name?.[0]}
                    </span>
                    <span>{patientDisplayName}</span>
                  </div>
                  <span className="text-[11px] text-purple-700 font-mono bg-purple-100 px-2 py-0.5 rounded-md">
                    #{initialPatient.patient_number || 'P-00'}
                  </span>
                </div>
              ) : (
                <ModalSelect
                  accent="purple"
                  required
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                >
                  <option value="">-- Sélectionner le patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name || p.name} ({p.phone || 'Sans tél'})
                    </option>
                  ))}
                </ModalSelect>
              )}
            </FormField>

            {/* Médecin / Soignant */}
            <FormField label="Médecin / Spécialiste" required>
              <ModalSelect
                accent="purple"
                required
                value={doctorId}
                onChange={e => {
                  const doc = doctorsList.find(d => d.id === e.target.value);
                  setDoctorId(e.target.value);
                  setDoctorName(doc ? doc.name : e.target.value);
                }}
              >
                <option value="">-- Choisir un médecin --</option>
                {doctorsList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.service || (d.role === 'gynecologue' ? 'Gynécologie' : 'Médecine Générale')}
                  </option>
                ))}
              </ModalSelect>
            </FormField>
          </div>

          {/* Mini-carte du médecin sélectionné */}
          {selectedDoctorObj && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800">{selectedDoctorObj.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedDoctorObj.service || 'Médecine'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Disponible
              </span>
            </div>
          )}
        </FormSection>

        {/* ─── SECTION 2: PROGRAMMATION & PRIORITÉ ────────────────────────────── */}
        <FormSection title="2. Date, Créneau & Priorité d'Accueil" icon={<Clock className="w-4 h-4 text-purple-600" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date & Heure du Rendez-vous" required hint="Créneau réservé dans l'agenda du médecin.">
              <ModalInput
                accent="purple"
                type="datetime-local"
                required
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
              />
            </FormField>

            <FormField label="Type de Consultation" required>
              <ModalSelect
                accent="purple"
                value={visitType}
                onChange={e => setVisitType(e.target.value)}
              >
                {VISIT_TYPES.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </ModalSelect>
            </FormField>
          </div>

          {/* Sélecteur de priorité tactile */}
          <div className="pt-2">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Niveau de Priorité
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'normal', label: 'Normal', icon: '✓', color: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100' },
                { id: 'urgent', label: '⚡ Urgent', icon: '⚡', color: 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100' },
                { id: 'emergency', label: '🚨 Urgence Vitale', icon: '🚨', color: 'border-rose-500 bg-rose-50 text-rose-800 hover:bg-rose-100' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  className={cn(
                    'py-2.5 px-3 rounded-2xl border-2 text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                    priority === p.id
                      ? `${p.color} ring-3 ring-purple-500/20 shadow-md scale-[1.02]`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statut si mode édition */}
          {isEditing && (
            <div className="pt-2">
              <FormField label="Statut du Rendez-vous">
                <ModalSelect
                  accent="purple"
                  value={status}
                  onChange={e => setStatus(e.target.value as AppointmentStatus)}
                >
                  <option value="planifie">🗓️ Planifié</option>
                  <option value="confirme">✅ Confirmé</option>
                  <option value="termine">🏁 Terminé / Effectué</option>
                  <option value="annule">❌ Annulé</option>
                  <option value="reporte">⏳ Reporté</option>
                </ModalSelect>
              </FormField>
            </div>
          )}
        </FormSection>

        {/* ─── SECTION 3: INSTRUCTIONS & REMARQUES ─────────────────────────────── */}
        <FormSection title="3. Remarques Cliniques & Instructions d'Accueil" icon={<FileText className="w-4 h-4 text-purple-600" />}>
          <ModalTextarea
            accent="purple"
            rows={3}
            placeholder="Motif de consultation, documents ou bilans à apporter, précautions particulières..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </FormSection>
      </form>
    </ModalShell>
  );
}
