'use client';
import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditApi } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

const actionBadge = (a: string) => {
  const map: Record<string, 'info' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'destructive',
    IMPORT: 'info',
    MANUAL_LINK: 'warning',
    CALCULATE: 'secondary',
    APPROVE: 'success',
    REJECT: 'destructive',
  };
  return <Badge variant={map[a] ?? 'outline'}>{a}</Badge>;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    auditApi.list({ limit: 200 })
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <Header title="Auditoria" subtitle="Registro completo de ações do sistema" />
      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filtrar por entidade ou ação..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID Entidade</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{actionBadge(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{log.entity}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400 max-w-[120px] truncate">
                        {log.entityId ?? '—'}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div>
                            <p className="text-sm font-medium">{log.user.name}</p>
                            <p className="text-xs text-slate-400">{log.user.email}</p>
                          </div>
                        ) : <span className="text-slate-400 text-xs">Sistema</span>}
                      </TableCell>
                      <TableCell>
                        {log.payload ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600 hover:underline">Ver dados</summary>
                            <pre className="mt-1 max-w-[300px] overflow-auto rounded bg-slate-50 p-2 text-[10px]">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        ) : '—'}
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
