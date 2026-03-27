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

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  IMPORT: 'Importação',
  MANUAL_LINK: 'Vínculo manual',
  CALCULATE: 'Cálculo',
  APPROVE: 'Aprovação',
  REJECT: 'Rejeição',
  LOGIN: 'Login',
  EXPORT: 'Exportação',
};

const ENTITY_LABELS: Record<string, string> = {
  StockSnapshot: 'Snapshot de Estoque',
  StockSnapshotItem: 'Item de Estoque',
  NfeDocument: 'NF-e',
  NfeItem: 'Item de NF-e',
  ProductMatch: 'Conciliação',
  StockOriginAllocation: 'Alocação de Origem',
  CreditCalculation: 'Cálculo de Crédito',
  Dossier: 'Dossiê',
  Company: 'Empresa',
  Branch: 'Filial',
  Product: 'Produto',
  ProductAlias: 'Alias de Produto',
  User: 'Usuário',
  TaxRule: 'Regra Fiscal',
  Issue: 'Pendência',
};

const actionBadge = (a: string) => {
  const map: Record<string, 'info' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'destructive',
    IMPORT: 'info',
    MANUAL_LINK: 'warning',
    CALCULATE: 'secondary',
    APPROVE: 'success',
    REJECT: 'destructive',
    LOGIN: 'outline',
    EXPORT: 'secondary',
  };
  return <Badge variant={map[a] ?? 'outline'}>{ACTION_LABELS[a] ?? a}</Badge>;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    auditApi.list({ limit: 200 })
      .then((r) => setLogs(r.logs ?? r ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    const matchSearch =
      (ENTITY_LABELS[l.entity] ?? l.entity).toLowerCase().includes(search.toLowerCase()) ||
      (ACTION_LABELS[l.action] ?? l.action).toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchEntity = !entityFilter || l.entity === entityFilter;
    return matchSearch && matchEntity;
  });

  const entities = Array.from(new Set(logs.map((l) => l.entity))).sort();

  return (
    <div>
      <Header title="Auditoria" subtitle="Registro completo de todas as ações realizadas no sistema" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filtrar por entidade, ação ou usuário..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">Todas as entidades</option>
            {entities.map((e) => (
              <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
            ))}
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID do Registro</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Detalhes</TableHead>
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
                      <TableCell className="text-sm font-medium text-slate-700">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                      </TableCell>
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
