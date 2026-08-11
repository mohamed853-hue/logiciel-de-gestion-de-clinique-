import { cn } from '../utils/cn';

// =============================================================================
// StatusBadge — Badge de statut sémantique réutilisable
// =============================================================================

export type StatusVariant =
  // Rendez-vous
  | 'planifie' | 'confirme' | 'en_attente' | 'en_consultation'
  | 'en_cours' | 'termine' | 'annule' | 'reporte' | 'absent'
  // Patient état
  | 'stable' | 'surveiller' | 'urgent' | 'grave' | 'critique' | 'inconscient'
  // Lab / Prescription
  | 'en_attente_lab' | 'delivree' | 'partiellement_delivree'
  // Priorité
  | 'routine' | 'urgence' | 'emergency'
  // Générique
  | 'actif' | 'suspendu' | 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Rendez-vous
  planifie:            { label: 'Planifié',          className: 'bg-slate-100 text-slate-700' },
  confirme:            { label: 'Confirmé',           className: 'bg-emerald-100 text-emerald-700' },
  en_attente:          { label: 'En attente',         className: 'bg-amber-100 text-amber-700' },
  en_consultation:     { label: 'En consultation',   className: 'bg-blue-100 text-blue-700' },
  en_cours:            { label: 'En cours',           className: 'bg-blue-100 text-blue-700' },
  termine:             { label: 'Terminé',            className: 'bg-emerald-100 text-emerald-700' },
  annule:              { label: 'Annulé',             className: 'bg-red-100 text-red-700' },
  reporte:             { label: 'Reporté',            className: 'bg-purple-100 text-purple-700' },
  absent:              { label: 'Absent',             className: 'bg-orange-100 text-orange-700' },

  // État patient
  stable:              { label: 'Stable',             className: 'bg-emerald-100 text-emerald-700' },
  surveiller:          { label: 'À surveiller',       className: 'bg-amber-100 text-amber-700' },
  urgent:              { label: 'Urgent',             className: 'bg-orange-100 text-orange-700' },
  grave:               { label: 'Grave',              className: 'bg-red-100 text-red-700' },
  critique:            { label: 'Critique',           className: 'bg-red-200 text-red-800' },
  inconscient:         { label: 'Inconscient',        className: 'bg-purple-200 text-purple-900' },

  // Ordonnances / Lab
  delivree:            { label: 'Délivrée',           className: 'bg-emerald-100 text-emerald-700' },
  partiellement_delivree: { label: 'Part. délivrée', className: 'bg-amber-100 text-amber-700' },
  en_attente_lab:      { label: 'En attente',         className: 'bg-amber-100 text-amber-700' },

  // Priorité
  routine:             { label: 'Routine',            className: 'bg-slate-100 text-slate-600' },
  urgence:             { label: 'Urgent',             className: 'bg-orange-100 text-orange-700' },
  emergency:           { label: '🚨 Urgence',         className: 'bg-red-200 text-red-800' },

  // Compte utilisateur
  actif:               { label: 'Actif',              className: 'bg-emerald-100 text-emerald-700' },
  suspendu:            { label: 'Suspendu',           className: 'bg-red-100 text-red-700' },

  // Génériques
  success:             { label: 'Succès',             className: 'bg-emerald-100 text-emerald-700' },
  warning:             { label: 'Attention',          className: 'bg-amber-100 text-amber-700' },
  error:               { label: 'Erreur',             className: 'bg-red-100 text-red-700' },
  info:                { label: 'Info',               className: 'bg-blue-100 text-blue-700' },
};

export function StatusBadge({ status, size = 'sm', className, dot = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-100 text-slate-600' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        config.className,
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', 
          config.className.includes('emerald') ? 'bg-emerald-500' :
          config.className.includes('amber') ? 'bg-amber-500' :
          config.className.includes('red') ? 'bg-red-500' :
          config.className.includes('blue') ? 'bg-blue-500' :
          config.className.includes('purple') ? 'bg-purple-500' :
          config.className.includes('orange') ? 'bg-orange-500' :
          'bg-slate-400'
        )} />
      )}
      {config.label}
    </span>
  );
}

// Helper pour obtenir la couleur de fond en fonction du statut d'état patient
export function getArrivalStatusColor(status: string): string {
  const colors: Record<string, string> = {
    stable: 'from-emerald-500 to-teal-500',
    surveiller: 'from-amber-500 to-yellow-500',
    urgent: 'from-orange-500 to-red-500',
    grave: 'from-red-500 to-red-600',
    critique: 'from-red-600 to-rose-700',
    inconscient: 'from-purple-600 to-indigo-700',
    autre: 'from-slate-500 to-slate-600',
  };
  return colors[status] || 'from-slate-500 to-slate-600';
}
