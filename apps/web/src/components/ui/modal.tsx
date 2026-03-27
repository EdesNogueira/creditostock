'use client';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ title, description, onClose, children, size = 'md' }: ModalProps) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        'relative z-10 w-full bg-white rounded-2xl shadow-2xl',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200',
        widths[size],
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Divider */}
        <div className="h-px bg-slate-100 mx-6" />
        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
