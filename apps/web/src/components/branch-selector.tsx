'use client';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { branchesApi } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  cnpj: string;
  city?: string;
  state?: string;
}

interface BranchSelectorProps {
  value: string;
  onChange: (id: string, branch?: Branch) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function BranchSelector({ value, onChange, placeholder = 'Selecione uma filial', className = '', required }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    branchesApi.list()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const branch = branches.find((b) => b.id === id);
    onChange(id, branch);
  };

  return (
    <div className={`relative ${className}`}>
      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={handleChange}
        required={required}
        disabled={loading}
        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{loading ? 'Carregando filiais...' : placeholder}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}{b.city ? ` — ${b.city}/${b.state}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
