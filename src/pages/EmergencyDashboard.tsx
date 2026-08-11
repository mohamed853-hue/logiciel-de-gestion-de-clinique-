import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import {
  AlertTriangle,
  Users,
  Activity,
  Clock,
  RefreshCw,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePatients } from '../hooks/usePatients';
import { PatientProfile } from '../components/PatientProfile';

export function EmergencyDashboard() {
  const { patients, loading, reload } = usePatients({ limit: 200 });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const urgentPatients = patients.filter(p =>
    ['urgent', 'grave', 'critique', 'inconscient'].includes(p.arrival_status || '')
  );
  const stablePatients = patients.filter(p =>
    ['stable', 'surveiller'].includes(p.arrival_status || '')
  );

  const stats = [
    {
      title: 'Cas Urgents',
      value: urgentPatients.length.toString(),
      sub: 'Prise en charge immédiate',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'from-red-500 to-rose-500',
    },
    {
      title: 'Sous Surveillance',
      value: stablePatients.length.toString(),
      sub: 'À surveiller',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Total en Attente',
      value: patients.length.toString(),
      sub: 'Tous patients',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Critiques',
      value: patients.filter(p => ['critique', 'inconscient'].includes(p.arrival_status || '')).length.toString(),
      sub: 'État critique / inconscient',
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500 to-violet-500',
    },
  ];

  const getPriorityColor = (status?: string) => {
    switch (status) {
      case 'critique':
      case 'inconscient':
        return 'border-l-4 border-l-red-600 bg-red-50';
      case 'grave':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'urgent':
        return 'border-l-4 border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-4 border-l-blue-400 bg-blue-50';
    }
  };

  const getPriorityLabel = (status?: string) => {
    switch (status) {
      case 'critique': return { label: 'CRITIQUE', cls: 'bg-red-600 text-white' };
      case 'inconscient': return { label: 'INCONSCIENT', cls: 'bg-red-700 text-white' };
      case 'grave': return { label: 'GRAVE', cls: 'bg-orange-500 text-white' };
      case 'urgent': return { label: 'URGENT', cls: 'bg-amber-500 text-white' };
      default: return { label: 'SURVEILLER', cls: 'bg-blue-500 text-white' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Tableau de Bord Urgences
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Suivi en temps réel des patients en état d'urgence</p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
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

      {/* Patients Urgents */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cas critiques */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Patients Urgents / Critiques
              </CardTitle>
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full animate-pulse-subtle">
                {urgentPatients.length} cas
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="list" rows={4} />
            ) : urgentPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="font-semibold text-slate-600">Aucun cas urgent</p>
                <p className="text-sm mt-1">Tous les patients sont stables</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentPatients.map((patient) => {
                  const priority = getPriorityLabel(patient.arrival_status);
                  return (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={cn(
                        'p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md transition-all',
                        getPriorityColor(patient.arrival_status)
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', priority.cls)}>
                            {priority.label}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {patient.first_name} {patient.last_name || patient.name}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Motif : {patient.visit_reason || 'Non précisé'}
                        </p>
                        {patient.phone && (
                          <p className="text-xs text-slate-500 font-mono">{patient.phone}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sous surveillance */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Sous Surveillance
              </CardTitle>
              <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full">
                {stablePatients.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState type="list" rows={4} />
            ) : stablePatients.length === 0 ? (
              <EmptyState title="Aucun patient" description="Les patients stables sous surveillance apparaîtront ici." />
            ) : (
              <div className="space-y-3">
                {stablePatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between cursor-pointer hover:bg-blue-50/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                        {patient.first_name?.[0]}{patient.last_name?.[0] || patient.name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {patient.first_name} {patient.last_name || patient.name}
                        </p>
                        <p className="text-xs text-slate-500">{patient.visit_reason || 'Consultation'}</p>
                      </div>
                    </div>
                    <StatusBadge status={patient.arrival_status || 'stable'} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Profil Patient */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  );
}
