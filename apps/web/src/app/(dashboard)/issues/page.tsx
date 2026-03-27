'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Search, Filter } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { issuesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Issue {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  createdAt: string;
  stockSnapshotItem?: { rawSku: string; rawDescription: string } | null;
}

const severityBadge = (s: string) => {
  const map: Record<string, 'critical' | 'high' | 'warning' | 'info'> = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  const labels: Record<string, string> = {
    CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo',
  };
  return <Badge variant={map[s] ?? 'outline'}>{labels[s] ?? s}</Badge>;
};

const statusBadge = (s: string) => {
  const map: Record<string, 'warning' | 'info' | 'success' | 'secondary'> = {
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    IGNORED: 'secondary',
  };
  const labels: Record<string, string> = {
    OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvido', IGNORED: 'Ignorado',
  };
  return <Badge variant={map[s] ?? 'outline'}>{labels[s] ?? s}</Badge>;
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    issuesApi.list({ status: statusFilter || undefined, page: 1, limit: 100 })
      .then((r) => setIssues(r.items))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = issues.filter(
    (i) => i.title.toLowerCase().includes(search.toLowerCase()),
  );

  const bySeverity = {
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: issues.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: issues.filter((i) => i.severity === 'MEDIUM').length,
    LOW: issues.filter((i) => i.severity === 'LOW').length,
  };

  return (
    <div>
      <Header title="Pendências" subtitle="Itens com problemas na conciliação fiscal" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Summary */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Object.entries(bySeverity).map(([sev, count]) => (
            <div key={sev} className="rounded-lg border bg-white p-4 flex items-center justify-between">
              {severityBadge(sev)}
              <span className="text-2xl font-bold">{count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === '' ? 'Todos' : s === 'OPEN' ? 'Abertos' : s === 'IN_PROGRESS' ? 'Em andamento' : 'Resolvidos'}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gravidade</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Item de Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma pendência encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{severityBadge(issue.severity)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{issue.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {issue.stockSnapshotItem ? (
                          <div>
                            <p className="font-mono text-xs">{issue.stockSnapshotItem.rawSku}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">{issue.stockSnapshotItem.rawDescription}</p>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{statusBadge(issue.status)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(issue.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => issuesApi.update(issue.id, { status: 'IN_PROGRESS' }).then(load)}
                        >
                          Tratar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
