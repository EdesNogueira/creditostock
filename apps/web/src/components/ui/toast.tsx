'use client';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  update: (id: string, t: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => '',
  dismiss: () => {},
  update: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-blue-200 bg-blue-50',
  loading: 'border-blue-200 bg-blue-50',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
  loading: 'text-blue-600 animate-spin',
};

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>): string => {
    const id = `toast-${++counter}`;
    const newToast = { ...t, id };
    setToasts(prev => [...prev, newToast]);

    if (t.type !== 'loading' && (t.duration ?? 5000) > 0) {
      setTimeout(() => dismiss(id), t.duration ?? 5000);
    }

    return id;
  }, [dismiss]);

  const update = useCallback((id: string, partial: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...partial };
      if (partial.type && partial.type !== 'loading') {
        setTimeout(() => dismiss(id), partial.duration ?? 4000);
      }
      return updated;
    }));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-sm',
                'animate-in slide-in-from-right-5 fade-in-0 duration-300',
                STYLES[t.type],
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', ICON_STYLES[t.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>
                )}
              </div>
              {t.type !== 'loading' && (
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
