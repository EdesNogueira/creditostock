'use client';
import { useEffect, useState, useCallback } from 'react';
import { Database, Search, Loader2, Package, DollarSign, GitMerge, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { SnapshotSelector } from '@/components/snapshot-selector';
import { stockApi, api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, formatPercent } from '@/lib/utils';

interface StockItem {
  id: string; rawSku: string; rawDescription: string; rawNcm?: string;
  quantity: string; unitCost: string; totalCost: string; unit: string;
  product?: { description: string; sku: string } | null;
  _count?: { productMatches: number; originAllocations: number };
}

interface SnapshotStats {
  distinctSkus: number; totalItems: number; totalValue: number;
  matchedItems: number; reconciledPct: number;
}

export default function EstoqueAtualPage() {
  const [branchId, setBranchId] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [items, setItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<SnapshotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadItems = useCallback(async (sid?: string) => {
    const id = sid ?? snapshotId;
    if (!id) return;
    setLoading(true);
    try {
      const r = await stockApi.getItems(id, { search: search || undefined, page, limit: 50 });
      setItems(r.items ?? []);
      setTotal(r.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, [snapshotId, search, page]);

  const loadStats = async (sid: string) => {
    try {
      const r = await api.get(`/stock/${sid}/stats`);
      setStats(r.data);
    } catch { setStats(null); }
  };

  useEffect(() => { if (snapshotId) loadItems(); }, [snapshotId, page]);

  const handleSnapshotChange = (sid: string) => {
    setSnapshotId(sid);
    setPage(1);
    loadItems(sid);
    loadStats(sid);
  };
  const handleSearch = () => { setPage(1); loadItems(); };

  // Use stats from full snapshot, NOT from paginated items
  const distinctSkus = stats?.distinctSkus ?? 0;
  const totalValue = stats?.totalValue ?? 0;
  const reconciledPct = stats?.reconciledPct ?? 0;

  return (
    <div>
      <Header title="Estoque Atual" subtitle="Visualize o estoque importado por snapshot e filial" />
      <div className="p-4 lg:p-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Filial</Label>
              <BranchSelector value={branchId} onChange={(id) => { setBranchId(id); setSnapshotId(''); }} placeholder="Todas as filiais" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Snapshot de Estoque</Label>
              <SnapshotSelector value={snapshotId} onChange={handleSnapshotChange} branchId={branchId} placeholder="Selecione um snapshot" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por SKU ou descrição..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <button onClick={handleSearch} className="px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Buscar</button>
          </div>
        </div>

        {/* Stats cards */}
        {snapshotId && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <Package className="h-5 w-5 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{formatNumber(distinctSkus)}</p>
              <p className="text-xs text-slate-500">SKUs Distintos</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <BarChart3 className="h-5 w-5 text-slate-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats?.totalItems ?? total)}</p>
              <p className="text-xs text-slate-500">Total de Itens</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-slate-500">Valor Total</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <GitMerge className="h-5 w-5 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">{formatPercent(reconciledPct)}</p>
              <p className="text-xs text-slate-500">Conciliado</p>
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-slate-600" />
              <p className="font-semibold text-slate-800">Itens do Estoque</p>
            </div>
            {total > 0 && <p className="text-xs text-slate-500">{formatNumber(total)} itens • Página {page}</p>}
          </div>

          {!snapshotId ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Selecione um snapshot para visualizar o estoque</p>
              <p className="text-sm mt-1">Escolha a filial e o snapshot acima</p>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-400"><p>Nenhum item encontrado</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['SKU', 'Descrição', 'Qtd', 'Custo Unit.', 'Total', 'Un.', 'NCM', 'Conciliação'].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 font-medium text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(item => {
                      const matches = item._count?.productMatches ?? 0;
                      const allocs = item._count?.originAllocations ?? 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{item.rawSku}</td>
                          <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-600">{item.rawDescription}</td>
                          <td className="py-2.5 px-3 font-semibold">{formatNumber(parseFloat(item.quantity))}</td>
                          <td className="py-2.5 px-3">{formatCurrency(parseFloat(item.unitCost))}</td>
                          <td className="py-2.5 px-3 font-semibold">{formatCurrency(parseFloat(item.totalCost))}</td>
                          <td className="py-2.5 px-3"><Badge variant="outline" className="text-xs">{item.unit}</Badge></td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.rawNcm ?? '—'}</td>
                          <td className="py-2.5 px-3">
                            {matches > 0
                              ? <Badge variant="success" className="text-xs">{allocs} NF-e</Badge>
                              : <Badge variant="secondary" className="text-xs">Pendente</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {total > 50 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                  <span className="text-xs text-slate-500">Página {page} de {Math.ceil(total / 50)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Próxima</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
