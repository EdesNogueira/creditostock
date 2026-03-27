'use client';
import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { stockApi } from '@/lib/api';

interface Snapshot {
  id: string;
  referenceDate: string;
  fileName: string;
  totalItems: number;
  jobStatus: string;
  branch: { name: string };
}

interface SnapshotSelectorProps {
  value: string;
  onChange: (id: string) => void;
  branchId?: string;
  placeholder?: string;
  className?: string;
}

export function SnapshotSelector({ value, onChange, branchId, placeholder = 'Selecione um snapshot', className = '' }: SnapshotSelectorProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    stockApi.list(branchId)
      .then((data) => setSnapshots(Array.isArray(data) ? data.filter((s: Snapshot) => s.jobStatus === 'DONE') : []))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <div className={`relative ${className}`}>
      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{loading ? 'Carregando...' : placeholder}</option>
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            {new Date(s.referenceDate).toLocaleDateString('pt-BR')} — {s.fileName} ({s.totalItems} itens) — {s.branch?.name}
          </option>
        ))}
      </select>
    </div>
  );
}
