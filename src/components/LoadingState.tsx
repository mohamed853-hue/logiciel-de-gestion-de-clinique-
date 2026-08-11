interface LoadingStateProps {
  rows?: number;
  type?: 'list' | 'cards' | 'table' | 'inline';
  text?: string;
}

export function LoadingState({ rows = 5, type = 'list', text }: LoadingStateProps) {
  if (type === 'inline') {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-4">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">{text || 'Chargement...'}</span>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-8 w-12 bg-slate-200 rounded" />
              </div>
              <div className="w-14 h-14 rounded-xl bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-1 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg mb-3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-50 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {text && (
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{text}</span>
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-200 rounded" />
          </div>
          <div className="w-20 h-7 bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}
