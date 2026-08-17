import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div onClick={onClick} className={cn('bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 border-b border-slate-200/70 bg-gradient-to-r from-white to-slate-50/80', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn('text-xl font-bold text-slate-800', className)}>
      {children}
    </h3>
  );
}
