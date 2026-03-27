'use client';
import { useEffect, useState } from 'react';
import { GitMerge, Search, Eye, Link, Play } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reconciliationApi } from '@/lib/api';
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

interface Stats {
  total: number;
  matched: number;
  unmatched: number;
  allocated: number;
  reconciledPct: number;
}

const matchTypeBadge = (type: string) => {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'outline' }> = {
    EXACT_SKU: { label: 'SKU Exato', variant: 'success' },
    EXACT_EAN: { label: 'EAN Exato', variant: 'success' },
    ALIAS: { label: 'Alias', variant: 'info' },
    FUZZY_DESCRIPTION_NCM: { label: 'Fuzzy', variant: 'warning' },
    MANUAL: { label: 'Manual', variant: 'outline' },
  };
  const m = map[type] ?? { label: type, variant: 'outline' as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function ReconciliationPage() {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const snapshotId = ''; // In production: from URL params or context

  useEffect(() => {
    reconciliationApi.list({ page: 1, limit: 100 })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(
    (i) =>
      i.rawSku.toLowerCase().includes(search.toLowerCase()) ||
      i.rawDescription.toLowerCase().includes(search.toLowerCase()),
  );

  const totalIcms = items.reduce(
    (sum, i) => sum + i.originAllocations.reduce((s, a) => s + parseFloat(a.allocatedIcms), 0),
    0,
  );

  const matched = items.filter((i) => i.productMatches.some((m) => m.isConfirmed)).length;
  const reconciledPct = items.length > 0 ? (matched / items.length) * 100 : 0;

  return (
    <div>
      <Header title="Conciliação" subtitle="Vinculação de itens de estoque com NF-e" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Total de Itens</p>
            <p className="text-2xl font-bold">{formatNumber(items.length)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Conciliados</p>
            <p className="text-2xl font-bold text-green-600">{formatNumber(matched)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{formatNumber(items.length - matched)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">ICMS Alocado</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalIcms)}</p>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso da Conciliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>{formatNumber(matched)} de {formatNumber(items.length)} itens conciliados</span>
              <span className="font-semibold">{formatPercent(reconciledPct)}</span>
            </div>
            <Progress value={reconciledPct} className="h-3" />
          </CardContent>
        </Card>

        {/* Filters & Actions */}
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
          <Button variant="outline" onClick={() => reconciliationApi.runMatching(snapshotId || 'demo')}>
            <Play className="mr-2 h-4 w-4" /> Executar Matching
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Tipo de Match</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>ICMS Alocado</TableHead>
                  <TableHead>Pendências</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <GitMerge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const bestMatch = item.productMatches[0];
                    const allocatedIcms = item.originAllocations.reduce(
                      (s, a) => s + parseFloat(a.allocatedIcms),
                      0,
                    );
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.rawSku}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-sm">{item.rawDescription}</p>
                        </TableCell>
                        <TableCell>{formatNumber(parseFloat(item.quantity))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.totalCost))}</TableCell>
                        <TableCell>
                          {bestMatch ? matchTypeBadge(bestMatch.matchType) : <Badge variant="secondary">Não conciliado</Badge>}
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          {item._count.issues > 0 ? (
                            <Badge variant="warning">{item._count.issues}</Badge>
                          ) : (
                            <Badge variant="success">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Link className="h-4 w-4" />
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
