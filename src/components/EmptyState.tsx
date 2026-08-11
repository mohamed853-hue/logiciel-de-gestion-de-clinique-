import { Inbox, Search, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  type?: 'empty' | 'search' | 'error';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  type = 'empty',
}: EmptyStateProps) {
  const defaultIcon = type === 'search'
    ? <Search className="w-8 h-8 text-slate-400" />
    : type === 'error'
    ? <AlertCircle className="w-8 h-8 text-red-400" />
    : <Inbox className="w-8 h-8 text-slate-400" />;

  const defaultTitle = type === 'search'
    ? 'Aucun résultat trouvé'
    : type === 'error'
    ? 'Impossible de charger les données'
    : 'Aucune donnée disponible';

  const defaultDesc = type === 'search'
    ? 'Essayez de modifier vos critères de recherche.'
    : type === 'error'
    ? 'Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez.'
    : 'Il n\'y a rien à afficher pour le moment.';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
        type === 'error' ? 'bg-red-50' : 'bg-slate-50'
      }`}>
        {icon || defaultIcon}
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {title || defaultTitle}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs mb-4">
        {description || defaultDesc}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
