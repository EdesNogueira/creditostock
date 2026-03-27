'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, FileText, GitMerge, AlertTriangle,
  CheckCircle, DollarSign, Link2, Loader2, ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reconciliationApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, formatPercent } from '@/lib/utils';

interface NfeDocument {
  id: string;
  chaveAcesso: string;
  numero: string;
  nomeEmitente: string;
  cnpjEmitente: string;
  dataEmissao: string;
}

interface NfeItem {
  id: string;
  cProd: string;
  xProd: string;
  ncm: string;
  cfop: string;
  cst: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
  vIcms: string;
  pIcms: string;
  nfeDocument: NfeDocument;
}

interface ProductMatch {
  id: string;
  matchType: string;
  confidence: number;
  isConfirmed: boolean;
  confirmedAt?: string;
  notes?: string;
  nfeItem: NfeItem;
}

interface Allocation {
  id: string;
  strategy: string;
  allocatedQty: string;
  allocatedCost: string;
  allocatedIcms: string;
  nfeItem: NfeItem;
}

interface Issue {
  id: string;
  title: string;
  severity: string;
  status: string;
  description: string;
}

interface StockItem {
  id: string;
  rawSku: string;
  rawDescription: string;
  rawEan?: string;
  rawNcm?: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  unit: string;
  product?: {
    id: string;
    description: string;
    sku: string;
    ean?: string;
    ncm?: string;
    aliases: { id: string; aliasType: string; aliasValue: string }[];
  };
  productMatches: ProductMatch[];
  originAllocations: Allocation[];
  issues: Issue[];
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

const severityBadge = (s: string) => {
  const map: Record<string, 'destructive' | 'warning' | 'info' | 'secondary'> = {
    CRITICAL: 'destructive', HIGH: 'destructive', MEDIUM: 'warning', LOW: 'info',
  };
  return <Badge variant={map[s] ?? 'secondary'}>{s}</Badge>;
};

export default function ReconciliationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    reconciliationApi.get(id)
      .then(setItem)
      .catch(() => setError('Item não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-red-600">{error || 'Item não encontrado'}</p>
      </div>
    );
  }

  const totalAllocatedIcms = item.originAllocations.reduce((s, a) => s + parseFloat(a.allocatedIcms), 0);
  const totalAllocatedCost = item.originAllocations.reduce((s, a) => s + parseFloat(a.allocatedCost), 0);
  const totalAllocatedQty = item.originAllocations.reduce((s, a) => s + parseFloat(a.allocatedQty), 0);
  const quantity = parseFloat(item.quantity);
  const reconciledPct = quantity > 0 ? Math.min((totalAllocatedQty / quantity) * 100, 100) : 0;
  const confirmedMatches = item.productMatches.filter((m) => m.isConfirmed).length;

  return (
    <div>
      <Header
        title={item.rawSku}
        subtitle={item.rawDescription}
      />
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.push('/reconciliation')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Conciliação
        </Button>

        {/* Trilha de rastreabilidade */}
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border">
          <span className="font-medium text-slate-700">Saldo atual</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-700">{confirmedMatches} nota(s) vinculada(s)</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-blue-700">{formatCurrency(totalAllocatedIcms)} ICMS rastreado</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-green-700">Memória de cálculo</span>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-slate-500 mb-1">Saldo em Estoque</p>
            <p className="text-2xl font-bold text-slate-900">{formatNumber(parseFloat(item.quantity))}</p>
            <p className="text-xs text-slate-400">{item.unit}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-slate-500 mb-1">Qtd Conciliada</p>
            <p className="text-2xl font-bold text-green-600">{formatNumber(totalAllocatedQty)}</p>
            <p className="text-xs text-slate-400">{formatPercent(reconciledPct)} do saldo</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-slate-500 mb-1">Custo Rastreado</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalAllocatedCost)}</p>
            <p className="text-xs text-slate-400">base fiscal</p>
          </div>
          <div className="rounded-lg border bg-blue-50 border-blue-100 p-4">
            <p className="text-xs text-blue-600 mb-1">ICMS Rastreado</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalAllocatedIcms)}</p>
            <p className="text-xs text-blue-400">crédito potencial</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-slate-500 mb-1">Pendências</p>
            <p className="text-2xl font-bold text-red-600">{item.issues.length}</p>
            <p className="text-xs text-slate-400">{item.issues.filter((i) => i.status === 'OPEN').length} abertas</p>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GitMerge className="h-4 w-4" /> Progresso de Conciliação deste Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-slate-600">
                {formatNumber(totalAllocatedQty)} de {formatNumber(parseFloat(item.quantity))} unidades vinculadas a NF-e
              </span>
              <span className="font-bold text-blue-600">{formatPercent(reconciledPct)}</span>
            </div>
            <Progress value={reconciledPct} className="h-3" />
            {reconciledPct < 100 && (
              <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {formatNumber(parseFloat(item.quantity) - totalAllocatedQty)} {item.unit} sem lastro documental
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Item Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> Dados do Item de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">SKU</p>
                  <p className="font-mono font-medium">{item.rawSku}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">EAN</p>
                  <p className="font-mono">{item.rawEan || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">NCM</p>
                  <p className="font-mono">{item.rawNcm || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Unidade</p>
                  <p>{item.unit}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Custo Unitário</p>
                  <p className="font-medium">{formatCurrency(parseFloat(item.unitCost))}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Custo Total</p>
                  <p className="font-medium">{formatCurrency(parseFloat(item.totalCost))}</p>
                </div>
              </div>
              {item.product && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500 mb-1">Produto Vinculado no Catálogo</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{item.product.description}</span>
                  </div>
                  {item.product.aliases.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.product.aliases.map((a) => (
                        <span key={a.id} className="text-xs bg-slate-100 rounded px-2 py-0.5 font-mono">
                          {a.aliasType}: {a.aliasValue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Pendências ({item.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.issues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Nenhuma pendência para este item</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {item.issues.map((issue) => (
                    <div key={issue.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{issue.title}</span>
                        <div className="flex gap-1">
                          {severityBadge(issue.severity)}
                          <Badge variant={issue.status === 'OPEN' ? 'warning' : issue.status === 'RESOLVED' ? 'success' : 'info'}>
                            {issue.status === 'OPEN' ? 'Aberta' : issue.status === 'IN_PROGRESS' ? 'Em andamento' : 'Resolvida'}
                          </Badge>
                        </div>
                      </div>
                      {issue.description && (
                        <p className="text-slate-500 text-xs">{issue.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* NF-e Allocations (the main fiscal proof) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Composição da Origem Fiscal — Nota a Nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.originAllocations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma NF-e vinculada a este item</p>
                <p className="text-xs mt-1">Execute o matching automático ou vincule manualmente uma nota</p>
              </div>
            ) : (
              <div className="space-y-4">
                {item.originAllocations.map((alloc) => {
                  const doc = alloc.nfeItem?.nfeDocument;
                  const pct = parseFloat(item.quantity) > 0
                    ? (parseFloat(alloc.allocatedQty) / parseFloat(item.quantity)) * 100
                    : 0;
                  return (
                    <div key={alloc.id} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{doc?.nomeEmitente || 'Fornecedor'}</p>
                          <p className="text-xs font-mono text-slate-500">{doc?.cnpjEmitente}</p>
                          {doc?.dataEmissao && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              Emissão: {formatDate(doc.dataEmissao)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs font-mono">NF-e {doc?.numero}</Badge>
                          <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-[180px]">
                            {doc?.chaveAcesso?.slice(0, 22)}...
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                        <div className="bg-white rounded p-2 text-center border">
                          <p className="text-xs text-slate-500">Qtd Alocada</p>
                          <p className="font-bold">{formatNumber(parseFloat(alloc.allocatedQty))}</p>
                        </div>
                        <div className="bg-white rounded p-2 text-center border">
                          <p className="text-xs text-slate-500">Custo Alocado</p>
                          <p className="font-bold text-slate-700">{formatCurrency(parseFloat(alloc.allocatedCost))}</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-center border border-blue-100">
                          <p className="text-xs text-blue-500">ICMS Alocado</p>
                          <p className="font-bold text-blue-700">{formatCurrency(parseFloat(alloc.allocatedIcms))}</p>
                        </div>
                        <div className="bg-white rounded p-2 text-center border">
                          <p className="text-xs text-slate-500">Alíquota ICMS</p>
                          <p className="font-bold">{alloc.nfeItem?.pIcms ?? '—'}%</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatPercent(pct)} do saldo total</span>
                        <div className="flex-1">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </div>

                      <div className="mt-2 flex gap-3 text-xs text-slate-500">
                        {alloc.nfeItem && (
                          <>
                            <span>SKU NF-e: <span className="font-mono">{alloc.nfeItem.cProd}</span></span>
                            <span>CFOP: <span className="font-mono">{alloc.nfeItem.cfop}</span></span>
                            <span>CST: <span className="font-mono">{alloc.nfeItem.cst}</span></span>
                            <span>NCM: <span className="font-mono">{alloc.nfeItem.ncm}</span></span>
                          </>
                        )}
                        <Badge variant="outline" className="text-xs">{alloc.strategy}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Matches */}
        {item.productMatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Vínculos com NF-e ({item.productMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item na NF-e</TableHead>
                    <TableHead>Tipo de Match</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota Fiscal</TableHead>
                    <TableHead>Qtd NF</TableHead>
                    <TableHead>ICMS NF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.productMatches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <p className="font-mono text-xs">{match.nfeItem?.cProd}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{match.nfeItem?.xProd}</p>
                      </TableCell>
                      <TableCell>{matchTypeBadge(match.matchType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={match.confidence * 100} className="h-2 w-16" />
                          <span className="text-xs">{(match.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.isConfirmed
                          ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Confirmado</Badge>
                          : <Badge variant="warning">Pendente revisão</Badge>}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{match.nfeItem?.nfeDocument?.nomeEmitente}</p>
                        <p className="text-xs font-mono text-slate-400">NF {match.nfeItem?.nfeDocument?.numero}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {match.nfeItem?.qCom ? formatNumber(parseFloat(match.nfeItem.qCom)) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-blue-600 font-medium">
                        {match.nfeItem?.vIcms ? formatCurrency(parseFloat(match.nfeItem.vIcms)) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Fiscal Summary Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <DollarSign className="h-4 w-4" /> Memória de Cálculo do Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-blue-600">Saldo em Estoque</p>
                <p className="text-lg font-bold text-blue-900">{formatNumber(parseFloat(item.quantity))} {item.unit}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Qtd com Lastro Fiscal</p>
                <p className="text-lg font-bold text-blue-900">{formatNumber(totalAllocatedQty)} {item.unit}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Base de Cálculo ICMS</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(totalAllocatedCost)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">ICMS Pago Identificado</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalAllocatedIcms)}</p>
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-3 border-t border-blue-200 pt-3">
              Dados apurados por alocação FIFO com base nas NF-es de entrada vinculadas. Validação final deve ser realizada pelo contador responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
