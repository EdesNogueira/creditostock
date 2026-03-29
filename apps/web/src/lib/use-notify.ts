'use client';
import { useToast } from '@/components/ui/toast';

export function useNotify() {
  const { toast, update, dismiss } = useToast();

  return {
    success: (title: string, description?: string) => toast({ type: 'success', title, description }),
    error: (title: string, description?: string) => toast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => toast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => toast({ type: 'info', title, description }),
    loading: (title: string, description?: string) => toast({ type: 'loading', title, description }),
    update,
    dismiss,
    handleError: (e: unknown, fallback = 'Erro inesperado') => {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message ?? (e instanceof Error ? e.message : fallback);
      toast({ type: 'error', title: msg });
    },
  };
}
