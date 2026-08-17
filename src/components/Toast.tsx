import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface ToastProps {
  toast?: ToastMessage | null;
  message?: ToastMessage | null;
  onClose: () => void;
}

export function Toast({ toast, message, onClose }: ToastProps) {
  const currentToast = toast || message;

  useEffect(() => {
    if (!currentToast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentToast, onClose]);

  if (!currentToast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-500/10',
    error: 'border-rose-200 bg-rose-50/95 text-rose-950 shadow-rose-500/10',
    info: 'border-blue-200 bg-blue-50/95 text-blue-950 shadow-blue-500/10',
    warning: 'border-amber-200 bg-amber-50/95 text-amber-950 shadow-amber-500/10',
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-md w-full animate-slide-in">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-2xl border shadow-2xl transition-all duration-300',
          borders[currentToast.type]
        )}
      >
        {icons[currentToast.type]}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm leading-tight">{currentToast.title}</h4>
          {currentToast.description && (
            <p className="text-xs opacity-80 mt-1 leading-normal">{currentToast.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 opacity-60 hover:opacity-100 transition-opacity rounded-lg hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
