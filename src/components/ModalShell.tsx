/**
 * ModalShell — Conteneur universel pour tous les modaux du système Al Shifa
 * Rendu direct via React Portal (document.body) avec gestion dynamique de la superposition,
 * déverrouillage propre du défilement, fermeture par touche Échap, et design ultra-moderne 100% net.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ModalPortal — Encapsule n'importe quel élément dans document.body
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return null;
  return createPortal(children, document.body);
}

interface ModalShellProps {
  /** Icône affichée dans le header (ReactNode) */
  icon?: React.ReactNode;
  /** Titre principal */
  title: string;
  /** Sous-titre (optionnel) */
  subtitle?: string;
  /** Couleur du dégradé header : 'blue' | 'purple' | 'teal' | 'rose' | 'amber' | 'indigo' | 'emerald' | 'violet' */
  color?: 'blue' | 'purple' | 'teal' | 'rose' | 'amber' | 'indigo' | 'emerald' | 'violet';
  /** Largeur max du modal */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  onClose: () => void;
  children: React.ReactNode;
  /** Boutons du footer — si omis, les boutons doivent être dans children */
  footer?: React.ReactNode;
  /** Niveau de superposition pour fenêtres superposables (1 = base z-1000, 2 = sur-modal z-1100, 3 = z-1200) */
  level?: number;
  /** z-index personnalisé explicite si nécessaire */
  zIndex?: number;
}

const GRADIENTS: Record<string, string> = {
  blue:    'from-slate-900 via-blue-950 to-indigo-950',
  purple:  'from-slate-900 via-purple-950 to-violet-950',
  teal:    'from-slate-900 via-teal-950 to-emerald-950',
  rose:    'from-slate-900 via-rose-950 to-pink-950',
  amber:   'from-slate-900 via-amber-950 to-orange-950',
  indigo:  'from-slate-900 via-indigo-950 to-slate-950',
  emerald: 'from-slate-900 via-emerald-950 to-teal-950',
  violet:  'from-slate-900 via-violet-950 to-purple-950',
};

const ACCENT_BARS: Record<string, string> = {
  blue:    'bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500',
  purple:  'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-violet-500',
  teal:    'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500',
  rose:    'bg-gradient-to-r from-rose-500 via-pink-400 to-red-500',
  amber:   'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500',
  indigo:  'bg-gradient-to-r from-indigo-500 via-blue-400 to-purple-500',
  emerald: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500',
  violet:  'bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-500',
};

const MAX_WIDTHS: Record<string, string> = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
};

export function ModalShell({
  icon,
  title,
  subtitle,
  color = 'blue',
  maxWidth = 'xl',
  onClose,
  children,
  footer,
  level = 1,
  zIndex: customZIndex,
}: ModalShellProps) {
  const gradient = GRADIENTS[color] || GRADIENTS.blue;
  const accentBar = ACCENT_BARS[color] || ACCENT_BARS.blue;
  const maxW = MAX_WIDTHS[maxWidth] || 'max-w-3xl';

  // Calcul du z-index dynamique pour la superposition propre
  const computedZIndex = customZIndex ?? (1000 + level * 100);

  // Verrouillage du scroll du body & écouteur Échap
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 overflow-y-auto animate-fade-in transition-all"
        style={{ zIndex: computedZIndex }}
        onClick={onClose}
      >
        <div
          className={cn(
            'bg-white rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200/90 animate-scale-in my-auto',
            maxW
          )}
          style={{ maxHeight: '88vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ligne d'accent lumineuse supérieure */}
          <div className={cn('h-1.5 w-full flex-shrink-0', accentBar)} />

          {/* ─── HEADER ─────────────────────────────────────────────────── */}
          <div className={cn('bg-gradient-to-r text-white px-6 py-4 flex-shrink-0 relative overflow-hidden', gradient)}>
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {icon && (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0 text-white">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-black text-base sm:text-lg leading-tight tracking-tight truncate text-white">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-white/70 font-medium truncate mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:bg-white/30 flex items-center justify-center transition-all border border-white/20 flex-shrink-0 text-white cursor-pointer hover:scale-105"
                title="Fermer (Échap)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── BODY ────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/70 p-5 sm:p-6 space-y-4">
            {children}
          </div>

          {/* ─── FOOTER ──────────────────────────────────────────────────── */}
          {footer && (
            <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-end gap-3 shadow-inner">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * FormSection — Section de formulaire moderne avec titre et icône
 */
interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}

export function FormSection({ title, icon, children, className, badge }: FormSectionProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">{title}</h3>
        </div>
        {badge && (
          <span className="px-2 py-0.5 bg-slate-200/80 text-slate-600 text-[10px] font-bold rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5">
        {children}
      </div>
    </div>
  );
}

/**
 * FormField — Label + input wrapper stylisé
 */
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}

export function FormField({ label, required, children, hint, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center gap-1 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}

/**
 * ModalInput — Champ de saisie stylisé standard
 */
interface ModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  accent?: 'blue' | 'purple' | 'teal' | 'rose' | 'emerald' | 'amber';
}

const ACCENT_RING: Record<string, string> = {
  blue:    'focus:border-blue-500 focus:ring-blue-500/20',
  purple:  'focus:border-purple-500 focus:ring-purple-500/20',
  teal:    'focus:border-teal-500 focus:ring-teal-500/20',
  rose:    'focus:border-rose-500 focus:ring-rose-500/20',
  emerald: 'focus:border-emerald-500 focus:ring-emerald-500/20',
  amber:   'focus:border-amber-500 focus:ring-amber-500/20',
};

export function ModalInput({ accent = 'blue', className, ...props }: ModalInputProps) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none',
        'focus:ring-3 transition-all bg-white font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal',
        'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs',
        ACCENT_RING[accent],
        className
      )}
    />
  );
}

/**
 * ModalSelect — Select stylisé
 */
interface ModalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  accent?: 'blue' | 'purple' | 'teal' | 'rose' | 'emerald' | 'amber';
}

export function ModalSelect({ accent = 'blue', className, children, ...props }: ModalSelectProps) {
  return (
    <select
      {...props}
      className={cn(
        'w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none',
        'focus:ring-3 transition-all bg-white font-semibold text-slate-800 shadow-xs',
        'cursor-pointer',
        ACCENT_RING[accent],
        className
      )}
    >
      {children}
    </select>
  );
}

/**
 * ModalTextarea — Textarea stylisé
 */
interface ModalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  accent?: 'blue' | 'purple' | 'teal' | 'rose' | 'emerald' | 'amber';
}

export function ModalTextarea({ accent = 'blue', className, ...props }: ModalTextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none resize-y min-h-[85px]',
        'focus:ring-3 transition-all bg-white font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal shadow-xs',
        ACCENT_RING[accent],
        className
      )}
    />
  );
}

/**
 * ModalErrorAlert — Alerte d'erreur dans le formulaire
 */
export function ModalErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-rose-50 text-rose-800 text-xs font-bold rounded-2xl border border-rose-200 shadow-xs animate-shake">
      <span className="text-base flex-shrink-0">⚠️</span>
      <span className="leading-snug">{message}</span>
    </div>
  );
}

/**
 * CancelButton — Bouton Annuler standard
 */
export function CancelButton({ onClick, children = 'Annuler' }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer shadow-xs"
    >
      {children}
    </button>
  );
}

/**
 * SubmitButton — Bouton de soumission stylisé
 */
interface SubmitButtonProps {
  loading?: boolean;
  loadingText?: string;
  color?: 'blue' | 'purple' | 'teal' | 'rose' | 'emerald' | 'violet' | 'indigo' | 'amber';
  children?: React.ReactNode;
  label?: string;
  disabled?: boolean;
  onClick?: (e?: any) => void;
}

const SUBMIT_COLORS: Record<string, string> = {
  blue:    'from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/25',
  purple:  'from-purple-600 via-purple-700 to-violet-800 hover:from-purple-700 hover:to-violet-900 shadow-purple-500/25',
  teal:    'from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-teal-500/25',
  rose:    'from-rose-600 via-rose-700 to-pink-700 hover:from-rose-700 hover:to-pink-800 shadow-rose-500/25',
  emerald: 'from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-500/25',
  violet:  'from-violet-600 via-violet-700 to-purple-800 hover:from-violet-700 hover:to-purple-900 shadow-violet-500/25',
  indigo:  'from-indigo-600 via-indigo-700 to-blue-800 hover:from-indigo-700 hover:to-blue-900 shadow-indigo-500/25',
  amber:   'from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25',
};

export function SubmitButton({ loading, loadingText = 'Traitement...', color = 'blue', children, label, disabled, onClick }: SubmitButtonProps) {
  const colors = SUBMIT_COLORS[color] || SUBMIT_COLORS.blue;
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-xl text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer',
        'bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none',
        colors
      )}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText}
        </>
      ) : (children || label || 'Valider')}
    </button>
  );
}
