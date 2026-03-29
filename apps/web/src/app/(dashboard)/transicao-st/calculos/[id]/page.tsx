'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, Package, DollarSign } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculationsApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';

export default function TransicaoCalcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [calc, setCalc] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    calculationsApi.get(id).then(setCalc).catch(() => setCalc(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (!calc) return <div className="p-6"><p className="text-red-600">Cálculo não encontrado</p></div>;

  const lots = (calc.transitionCreditLots ?? []) as Record<string, unknown>[];
  const branch = calc.branch as Record<string, unknown> | undefined;
  const rule = calc.transitionRule as Record<string, unknown> | undefined;

  return (
    <div>
      <Header title="Detalhe do Cálculo de Transição" subtitle={`${(branch?.name as string) ?? ''} — ${formatDate(calc.createdAt as string)}`} />
      <div className="p-4 lg:p-6 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => router.push('/transicao-st/calculos')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Crédito ICMS-ST', value: formatCurrency(parseFloat(String(calc.totalIcmsStCredit ?? 0))), color: 'bg-blue-50 border-blue-100 text-blue-700' },
            { label: 'Crédito FCP-ST', value: formatCurrency(parseFloat(String(calc.totalFcpStCredit ?? 0))), color: 'bg-amber-50 border-amber-100 text-amber-700' },
            { label: 'Crédito Gerado', value: formatCurrency(parseFloat(String(calc.totalTransitionCreditGenerated ?? 0))), color: 'bg-green-50 border-green-100 text-green-700' },
            { label: 'Bloqueado', value: formatCurrency(parseFloat(String(calc.totalTransitionCreditBlocked ?? 0))), color: 'bg-red-50 border-red-100 text-red-600' },
            { label: 'Disponível', value: formatCurrency(parseFloat(String(calc.totalTransitionCreditAvailable ?? 0))), color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl border p-4 text-center ${c.color}`}>
              <p className="text-xl font-bold">{c.value}</p>
              <p className="text-xs mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Rule info */}
        {rule && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800 mb-2">Regra Aplicada</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-slate-500">Nome:</span> <span className="font-semibold">{String(rule.name)}</span></div>
              <div><span className="text-slate-500">Método:</span> <span className="font-mono">{String(rule.calcMethod)}</span></div>
              <div><span className="text-slate-500">Status:</span> <Badge variant="success" className="text-xs">Aplicada</Badge></div>
            </div>
          </div>
        )}

        {/* Credit lots table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <p className="font-semibold text-slate-800">Lotes de Crédito ({lots.length})</p>
          </div>
          {lots.length === 0 ? (
            <div className="p-8 text-center text-slate-400"><DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Nenhum lote de crédito gerado</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['SKU', 'Produto', 'Qtd Estoque', 'Qtd Alocada', 'ICMS-ST Unit.', 'FCP-ST Unit.', 'Total ST', 'Creditável', 'Status'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lots.map((lot, i) => {
                    const si = lot.stockSnapshotItem as Record<string, unknown> | undefined;
                    const ni = lot.nfeItem as Record<string, unknown> | undefined;
                    const status = String(lot.status);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-semibold">{si?.rawSku as string ?? String(ni?.cProd ?? '')}</td>
                        <td className="py-2.5 px-3 max-w-[180px] truncate">{si?.rawDescription as string ?? String(ni?.xProd ?? '')}</td>
                        <td className="py-2.5 px-3">{formatNumber(parseFloat(String(lot.quantityInStock ?? 0)))}</td>
                        <td className="py-2.5 px-3">{formatNumber(parseFloat(String(lot.quantityAllocatedFromNfe ?? 0)))}</td>
                        <td className="py-2.5 px-3 text-blue-600">{formatCurrency(parseFloat(String(lot.unitIcmsSt ?? 0)))}</td>
                        <td className="py-2.5 px-3 text-amber-600">{formatCurrency(parseFloat(String(lot.unitFcpSt ?? 0)))}</td>
                        <td className="py-2.5 px-3 font-semibold">{formatCurrency(parseFloat(String(lot.totalIcmsSt ?? 0)))}</td>
                        <td className="py-2.5 px-3 font-bold text-green-700">{formatCurrency(parseFloat(String(lot.creditableAmount ?? 0)))}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={status === 'OPEN' ? 'success' : status === 'BLOCKED' ? 'destructive' : 'warning'} className="text-xs">
                            {status === 'OPEN' ? 'Disponível' : status === 'BLOCKED' ? 'Bloqueado' : status === 'PARTIALLY_USED' ? 'Parcial' : status === 'FULLY_USED' ? 'Utilizado' : status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
