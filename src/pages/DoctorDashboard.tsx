import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PatientProfile } from '../components/PatientProfile';
import { PrescriptionForm } from '../components/PrescriptionForm';
import { LabRequestForm } from '../components/LabRequestForm';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { 
  Users, 
  FlaskConical, 
  FileText, 
  AlertCircle, 
  Search, 
  Stethoscope, 
  Eye, 
  Pill,
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useLabRequests } from '../hooks/useLabRequests';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types';

type TabType = 'overview' | 'patients' | 'lab' | 'prescriptions';

export function DoctorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<Patient | null>(null);
  const [labPatient, setLabPatient] = useState<Patient | null>(null);

  // Custom Hooks
  const { patients, loading: loadingPatients, reload: reloadPatients } = usePatients({ limit: 100 });
  const { prescriptions, loading: loadingPrescriptions, reload: reloadPrescriptions } = usePrescriptions({ limit: 50 });
  const { labTests, loading: loadingLabs, reload: reloadLabs } = useLabRequests({ limit: 50 });

  // Écouteur de navigation globale via sidebar
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'patients' || path === '/dashboard/patients') setActiveTab('patients');
      else if (path === 'labs' || path === '/dashboard/labs') setActiveTab('lab');
      else if (path === 'prescriptions' || path === '/dashboard/prescriptions') setActiveTab('prescriptions');
      else setActiveTab('overview');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  const reloadAll = () => {
    reloadPatients();
    reloadPrescriptions();
    reloadLabs();
  };

  const filteredPatients = patients.filter(p =>
    !searchQuery ||
    p.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const urgentPatients = patients.filter(p => ['urgent', 'grave', 'critique'].includes(p.arrival_status || ''));
  const pendingLabsCount = labTests.filter(l => l.status === 'en_attente').length;

  const stats = [
    {
      title: 'Patients Enregistrés',
      value: patients.length.toString(),
      sub: 'Transmis par la réception',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Urgences à traiter',
      value: urgentPatients.length.toString(),
      sub: 'Nécessitent attention immédiate',
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'from-red-500 to-rose-500',
    },
    {
      title: 'Analyses en attente',
      value: pendingLabsCount.toString(),
      sub: 'Résultats en cours',
      icon: <FlaskConical className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Ordonnances délivrées',
      value: prescriptions.filter(p => p.status === 'delivree').length.toString(),
      sub: 'Déjà récupérées en pharmacie',
      icon: <FileText className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Espace Médecin</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Dr. {user?.firstName} {user?.lastName} — consultations et dossiers médicaux
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reloadAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          {patients.length > 0 && (
            <Button onClick={() => setPrescriptionPatient(patients[0])}>
              <Pill className="w-4 h-4 mr-2" />
              Rédiger Ordonnance
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.title} className="stat-card-motion border-0 shadow-sm cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md', stat.color)}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['overview', 'patients', 'lab', 'prescriptions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' :
             tab === 'patients' ? `Patients (${patients.length})` :
             tab === 'lab' ? `Analyses (${labTests.length})` : `Ordonnances (${prescriptions.length})`}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* File des patients créés par la réception */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" /> Patients Transmis par la Réception
                </CardTitle>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">
                  {patients.length} en file
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <LoadingState type="list" rows={5} />
              ) : patients.length === 0 ? (
                <EmptyState title="Aucun patient en attente" description="Les patients enregistrés à la réception apparaîtront ici." />
              ) : (
                <div className="space-y-3">
                  {patients.slice(0, 6).map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/60 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                          {patient.first_name?.[0]}{patient.last_name?.[0] || patient.name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {patient.first_name} {patient.last_name || patient.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Motif : <strong className="text-slate-700">{patient.visit_reason || 'Consultation'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={patient.arrival_status || 'stable'} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrescriptionPatient(patient);
                          }}
                          title="Rédiger Ordonnance"
                        >
                          <Pill className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLabPatient(patient);
                          }}
                          title="Demander Analyse"
                        >
                          <FlaskConical className="w-4 h-4 text-purple-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demandes et résultats d'analyses récents */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-600" /> Suivi des Demandes de Laboratoire
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLabs ? (
                <LoadingState type="list" rows={4} />
              ) : labTests.length === 0 ? (
                <EmptyState title="Aucune demande d'analyse" description="Les demandes créées apparaîtront ici avec leur statut." />
              ) : (
                <div className="space-y-3">
                  {labTests.slice(0, 5).map((lab) => (
                    <div key={lab.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{lab.test_name}</p>
                        <p className="text-slate-400 mt-0.5">Demandé par : {lab.requested_by}</p>
                        {lab.results_text && (
                          <p className="text-emerald-700 font-mono font-semibold mt-1 bg-emerald-50 p-1.5 rounded">
                            Résultat: {lab.results_text}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={lab.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: PATIENTS */}
      {activeTab === 'patients' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Dossiers Patients de la Clinique</CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
                  placeholder="Rechercher patient..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPatients ? (
              <LoadingState type="table" rows={6} />
            ) : filteredPatients.length === 0 ? (
              <EmptyState type="search" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                      <th className="text-left py-3 px-3">Patient</th>
                      <th className="text-left py-3 px-3">Motif</th>
                      <th className="text-left py-3 px-3">Téléphone</th>
                      <th className="text-center py-3 px-3">État</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(patient => (
                      <tr key={patient.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {patient.first_name} {patient.last_name || patient.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{patient.visit_reason || 'Consultation'}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-xs">{patient.phone}</td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={patient.arrival_status || 'stable'} />
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(patient.id)}>
                            <Eye className="w-4 h-4 mr-1" /> Dossier
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPrescriptionPatient(patient)}>
                            <Pill className="w-4 h-4 mr-1 text-blue-600" /> Ordonnance
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setLabPatient(patient)}>
                            <FlaskConical className="w-4 h-4 mr-1 text-purple-600" /> Labo
                          </Button>
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

      {/* TAB: LAB */}
      {activeTab === 'lab' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demandes et Résultats d'Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLabs ? (
              <LoadingState type="table" rows={6} />
            ) : labTests.length === 0 ? (
              <EmptyState title="Aucune analyse" />
            ) : (
              <div className="space-y-3">
                {labTests.map(lab => (
                  <div key={lab.id} className="p-4 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{lab.test_name}</p>
                      <p className="text-slate-500">Demandé par : {lab.requested_by}</p>
                      {lab.results_text && (
                        <p className="mt-2 text-emerald-800 bg-emerald-50 p-2 rounded-lg font-mono">
                          <strong>Résultat :</strong> {lab.results_text}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={lab.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB: PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Ordonnances Rédigées</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrescriptions ? (
              <LoadingState type="table" rows={6} />
            ) : prescriptions.length === 0 ? (
              <EmptyState title="Aucune ordonnance" />
            ) : (
              <div className="space-y-4">
                {prescriptions.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex justify-between items-center border-b pb-2 text-xs">
                      <span className="font-bold text-slate-800">{p.doctor_name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="space-y-1">
                      {p.items?.map((item, idx) => (
                        <div key={idx} className="text-xs bg-slate-50 p-2 rounded-lg flex justify-between">
                          <span className="font-semibold text-slate-700">{item.medicament} ({item.dosage})</span>
                          <span className="text-slate-500">{item.frequence} - {item.duree}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onNewPrescription={(p) => { setSelectedPatientId(null); setPrescriptionPatient(p); }}
          onNewLabRequest={(p) => { setSelectedPatientId(null); setLabPatient(p); }}
        />
      )}

      {prescriptionPatient && (
        <PrescriptionForm
          patient={prescriptionPatient}
          onClose={() => setPrescriptionPatient(null)}
          onSuccess={() => reloadPrescriptions()}
        />
      )}

      {labPatient && (
        <LabRequestForm
          patient={labPatient}
          onClose={() => setLabPatient(null)}
          onSuccess={() => reloadLabs()}
        />
      )}
    </div>
  );
}
