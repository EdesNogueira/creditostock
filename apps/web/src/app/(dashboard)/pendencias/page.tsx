'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { issuesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Issue {
  id: string; title: string; description?: string; severity: string;
  status: string; createdAt: string;
  stockSnapshotItem?: { rawSku: string; rawDescription: string } | null;
}

const SEV_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CRITICAL: { label: 'Crítico', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  HIGH:     { label: 'Alto',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  MEDIUM:   { label: 'Médio',   color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  LOW:      { label: 'Baixo',   color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'warning' | 'info' | 'success' | 'secondary' }> = {
  OPEN:        { label: 'Aberto',        icon: AlertCircle, variant: 'warning' },
  IN_PROGRESS: { label: 'Em andamento',  icon: Clock,       variant: 'info' },
  RESOLVED:    { label: 'Resolvido',     icon: CheckCircle2, variant: 'success' },
  IGNORED:     { label: 'Ignorado',      icon: AlertCircle, variant: 'secondary' },
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const limit = 50;

  const load = (p = page) => {
    setLoading(true);
    issuesApi.list({ status: statusFilter || undefined, severity: severityFilter || undefined, page: p, limit })
      .then((r) => { setIssues(r.items ?? []); setTotal(r.total ?? 0); })
      .catch(() => { setIssues([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); load(1); }, [statusFilter, severityFilter]);

  const totalPages = Math.ceil(total / limit);

  const handlePage = (p: number) => { setPage(p); load(p); };

  const resolveAll = async () => {
    if (!confirm(`Deseja marcar todas as ${total} pendências como resolvidas?`)) return;
    setLoading(true);
    try {
      for (const issue of issues.filter(i => i.status !== 'RESOLVED')) {
        await issuesApi.update(issue.id, { status: 'RESOLVED' });
      }
      load();
    } catch { alert('Erro ao resolver pendências'); setLoading(false); }
  };

  const filtered = issues.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.stockSnapshotItem?.rawSku ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const counts = Object.fromEntries(
    Object.keys(SEV_CONFIG).map(sev => [sev, issues.filter(i => i.severity === sev).length])
  );

  return (
    <div>
      <Header title="Pendências" subtitle="Itens que requerem atenção na conciliação fiscal" />
      <div className="p-4 lg:p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(SEV_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSeverityFilter(severityFilter === key ? '' : key)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                cfg.bg, cfg.border,
                severityFilter === key ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : '',
              )}
            >
              <p className={cn('text-3xl font-bold mb-1', cfg.color)}>{counts[key] ?? 0}</p>
              <p className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por SKU ou descrição..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-slate-500">{total} pendências no total</span>
          <div className="flex gap-1.5">
            {[
              { key: '', label: 'Todos' },
              { key: 'OPEN', label: 'Abertos' },
              { key: 'IN_PROGRESS', label: 'Em andamento' },
              { key: 'RESOLVED', label: 'Resolvidos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  statusFilter === key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Issues list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">Nenhuma pendência encontrada</p>
            <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length > 0 && statusFilter !== 'RESOLVED' && (
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={resolveAll}>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Resolver todas desta página
                </Button>
              </div>
            )}
            {filtered.map(issue => {
              const sev = SEV_CONFIG[issue.severity];
              const st = STATUS_CONFIG[issue.status];
              const StIcon = st?.icon ?? AlertCircle;
              return (
                <div
                  key={issue.id}
                  className={cn('flex items-start gap-4 rounded-2xl border p-4 bg-white hover:shadow-sm transition-shadow', sev?.border ?? 'border-slate-200')}
                >
                  {/* Severity indicator */}
                  <div className={cn('flex-shrink-0 mt-0.5 w-2 h-2 rounded-full self-center', {
                    'bg-red-500': issue.severity === 'CRITICAL',
                    'bg-orange-500': issue.severity === 'HIGH',
                    'bg-amber-400': issue.severity === 'MEDIUM',
                    'bg-blue-400': issue.severity === 'LOW',
                  })} />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', sev?.bg, sev?.color)}>
                        {sev?.label}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{issue.title}</span>
                    </div>
                    {issue.description && (
                      <p className="text-xs text-slate-500 truncate mb-1.5">{issue.description}</p>
                    )}
                    {issue.stockSnapshotItem && (
                      <p className="text-xs font-mono text-slate-400">
                        SKU: {issue.stockSnapshotItem.rawSku} — {issue.stockSnapshotItem.rawDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <Badge variant={st?.variant ?? 'outline'} className="flex items-center gap-1 text-xs">
                      <StIcon className="h-3 w-3" />{st?.label ?? issue.status}
                    </Badge>
                    <span className="text-xs text-slate-400">{formatDate(issue.createdAt)}</span>
                    {(issue.status === 'OPEN' || issue.status === 'IN_PROGRESS') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => issuesApi.update(issue.id, { status: 'RESOLVED' }).then(() => load())}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => issuesApi.update(issue.id, { status: 'IGNORED' }).then(() => load())}
                          className="text-xs text-slate-500 hover:text-slate-600 font-medium"
                        >
                          Ignorar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-500">
              Página {page} de {totalPages} ({total} itens)
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePage(page - 1)}>
                Anterior
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => handlePage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
