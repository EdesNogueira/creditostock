'use client';
import { useEffect, useState } from 'react';
import { GitMerge, Search, Link2, Play, RefreshCw, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BranchSelector } from '@/components/branch-selector';
import { SnapshotSelector } from '@/components/snapshot-selector';
import { HelpTooltip } from '@/components/help-tooltip';
import { reconciliationApi } from '@/lib/api';
import { useNotify } from '@/lib/use-notify';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

interface ReconciliationItem {
  id: string;
  rawSku: string;
  rawDescription: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  product: { description: string } | null;
  productMatches: { matchType: string; confidence: number; isConfirmed: boolean }[];
  originAllocations: { allocatedIcms: string }[];
  _count: { issues: number };
}

const matchTypeBadge = (type: string) => {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'outline' }> = {
    EXACT_SKU: { label: 'SKU Exato', variant: 'success' },
    EXACT_EAN: { label: 'EAN Exato', variant: 'success' },
    ALIAS: { label: 'Por Alias', variant: 'info' },
    FUZZY_DESCRIPTION_NCM: { label: 'Aproximado (Desc+NCM)', variant: 'warning' },
    MANUAL: { label: 'Manual', variant: 'outline' },
  };
  const m = map[type] ?? { label: type, variant: 'outline' as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function ReconciliationPage() {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [stats, setStats] = useState<{ total: number; matched: number; unmatched: number; allocated: number; reconciledPct: number } | null>(null);
  const notify = useNotify();

  const loadItems = (sid: string) => {
    if (!sid) { setItems([]); return; }
    setLoading(true);
    reconciliationApi.list({ snapshotId: sid, page: 1, limit: 200 })
      .then((r) => setItems(r.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadStats = (sid: string) => {
    if (!sid) { setStats(null); return; }
    reconciliationApi.getStats(sid)
      .then(setStats)
      .catch(() => setStats(null));
  };

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    setSnapshotId('');
    setItems([]);
    setStats(null);
  };

  const handleSnapshotChange = (sid: string) => {
    setSnapshotId(sid);
    loadItems(sid);
    loadStats(sid);
  };

  const handleMatching = async () => {
    if (!snapshotId) { notify.warning('Selecione um snapshot de estoque primeiro'); return; }
    setMatching(true);
    try {
      await reconciliationApi.runMatching(snapshotId);
      notify.success('Job de matching iniciado!', 'Aguarde alguns segundos e recarregue a página.');
    } catch (e) {
      notify.handleError(e, 'Erro ao iniciar matching');
    } finally {
      setMatching(false);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.rawSku.toLowerCase().includes(search.toLowerCase()) ||
      i.rawDescription.toLowerCase().includes(search.toLowerCase()),
  );

  const totalIcms = items.reduce(
    (sum, i) => sum + i.originAllocations.reduce((s, a) => s + parseFloat(a.allocatedIcms), 0),
    0,
  );

  const matched = stats?.matched ?? items.filter((i) => i.productMatches.some((m) => m.isConfirmed)).length;
  const total = stats?.total ?? items.length;
  const reconciledPct = stats?.reconciledPct ?? (total > 0 ? (matched / total) * 100 : 0);

  return (
    <div>
      <Header title="Conciliação" subtitle="Vinculação de itens de estoque com NF-e — nota a nota" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Snapshot selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[250px] space-y-1">
                <Label className="text-xs text-slate-500">Filial</Label>
                <BranchSelector value={branchId} onChange={handleBranchChange} />
              </div>
              <div className="flex-1 min-w-[280px] space-y-1">
                <Label className="text-xs text-slate-500">Snapshot de Estoque</Label>
                <SnapshotSelector value={snapshotId} onChange={handleSnapshotChange} branchId={branchId || undefined} />
              </div>
              <Button variant="outline" size="sm" onClick={() => { loadItems(snapshotId); loadStats(snapshotId); }} disabled={loading || !snapshotId}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recarregar
              </Button>
              <Button onClick={handleMatching} disabled={matching || !snapshotId} size="sm">
                {matching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...</> : <><Play className="mr-2 h-4 w-4" /> Executar Matching</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Total de Itens</p>
            <p className="text-2xl font-bold">{formatNumber(total)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Conciliados</p>
            <p className="text-2xl font-bold text-green-600">{formatNumber(matched)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{formatNumber(total - matched)}</p>
          </div>
          <div className="rounded-lg border bg-blue-50 border-blue-100 p-4">
            <p className="text-sm text-blue-600">ICMS Alocado</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalIcms)}</p>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso da Conciliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>{formatNumber(matched)} de {formatNumber(total)} itens conciliados</span>
              <span className="font-semibold text-blue-600">{formatPercent(reconciledPct)}</span>
            </div>
            <Progress value={reconciledPct} className="h-3" />
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filtrar por SKU ou descrição..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-slate-500">{filteredItems.length} itens</p>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden sm:table-cell">Qtd</TableHead>
                  <TableHead className="hidden md:table-cell">Custo Total</TableHead>
                  <TableHead className="flex items-center gap-1">
                    Tipo de Vínculo
                    <HelpTooltip text="SKU Exato: código idêntico ao da NF-e. EAN Exato: código de barras idêntico. Por Alias: encontrado via código alternativo. Aproximado (Desc+NCM): descrição similar + mesmo NCM — requer revisão." />
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Confiança</TableHead>
                  <TableHead>ICMS Alocado</TableHead>
                  <TableHead className="hidden sm:table-cell">Pendências</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <GitMerge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {snapshotId ? 'Nenhum item encontrado' : 'Selecione um snapshot para ver os itens'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const bestMatch = item.productMatches[0];
                    const allocatedIcms = item.originAllocations.reduce(
                      (s, a) => s + parseFloat(a.allocatedIcms),
                      0,
                    );
                    const isReconciled = item.productMatches.some((m) => m.isConfirmed);
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <TableCell className="font-mono text-xs">{item.rawSku}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-sm">{item.rawDescription}</p>
                          {item.product && (
                            <p className="text-xs text-slate-400 truncate">{item.product.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{formatNumber(parseFloat(item.quantity))}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatCurrency(parseFloat(item.totalCost))}</TableCell>
                        <TableCell>
                          {bestMatch ? matchTypeBadge(bestMatch.matchType) : <Badge variant="secondary">Não conciliado</Badge>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {bestMatch ? (
                            <div className="flex items-center gap-2">
                              <Progress value={bestMatch.confidence * 100} className="h-2 w-16" />
                              <span className="text-xs">{(bestMatch.confidence * 100).toFixed(0)}%</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {allocatedIcms > 0 ? (
                            <span className="text-blue-600 font-medium">{formatCurrency(allocatedIcms)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {item._count.issues > 0 ? (
                            <Badge variant="warning">{item._count.issues}</Badge>
                          ) : (
                            <Badge variant="success">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isReconciled ? 'text-green-500' : 'text-slate-400'}`}
                              title={isReconciled ? 'Conciliado' : 'Sem NF-e vinculada'}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
