'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Play, Loader2, Eye, ArrowRightLeft, Info } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { HelpTooltip } from '@/components/help-tooltip';
import { calculationsApi, taxTransitionApi } from '@/lib/api';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';

interface TransitionRule { id: string; name: string; calcMethod: string; stateFrom: string; isActive?: boolean; }
interface Calculation {
  id: string; kind: string; mode: string; status: string; branchId: string; createdAt: string; finishedAt?: string;
  potentialCredit: string; approvedCredit: string; blockedCredit: string;
  totalIcmsStCredit: string; totalFcpStCredit: string;
  totalTransitionCreditGenerated: string; totalTransitionCreditBlocked: string; totalTransitionCreditAvailable: string;
  reconciledPct: number; branch: { name: string; cnpj: string };
  transitionRule?: { name: string; calcMethod: string; stateFrom: string };
}

const statusBadge = (s: string) => {
  const map: Record<string, 'info' | 'warning' | 'success' | 'destructive'> = { PENDING: 'info', RUNNING: 'warning', DONE: 'success', ERROR: 'destructive' };
  const labels: Record<string, string> = { PENDING: 'Pendente', RUNNING: 'Calculando', DONE: 'Concluído', ERROR: 'Erro' };
  return <Badge variant={map[s] ?? 'outline'}>{labels[s] ?? s}</Badge>;
};

export default function TransicaoCalculosPage() {
  const router = useRouter();
  const [calcs, setCalcs] = useState<Calculation[]>([]);
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      calculationsApi.list(undefined, 'ST_TRANSITION').then(setCalcs).catch(() => setCalcs([])),
      taxTransitionApi.listRules().then((d: TransitionRule[]) => setRules(Array.isArray(d) ? d : [])).catch(() => setRules([])),
    ]).finally(() => setLoading(false));
  }, []);

  const load = () => { calculationsApi.list(undefined, 'ST_TRANSITION').then(setCalcs).catch(() => setCalcs([])); };

  const handleRun = async () => {
    if (!branchId || !ruleId) return alert('Selecione filial e regra de transição');
    setRunning(true);
    try {
      await calculationsApi.run({ branchId, kind: 'ST_TRANSITION', transitionRuleId: ruleId, transitionReferenceDate: refDate, mode: 'ASSISTED' });
      alert('Cálculo de transição ST iniciado! Aguarde o processamento.');
      setTimeout(load, 3000);
    } catch { alert('Erro ao iniciar cálculo'); } finally { setRunning(false); }
  };

  return (
    <div>
      <Header title="Cálculo de Transição ST" subtitle="Calcule créditos de transição de ICMS-ST para regime normal" />
      <div className="p-4 lg:p-6 space-y-5">
        {/* Run form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><ArrowRightLeft className="h-5 w-5 text-purple-600" /></div>
              <div><p className="font-semibold text-slate-900">Executar Cálculo de Transição</p><p className="text-xs text-slate-500">Apure créditos de ICMS-ST sobre estoque na data de transição</p></div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Filial <span className="text-red-500">*</span></Label>
                <BranchSelector value={branchId} onChange={id => setBranchId(id)} placeholder="Selecione" />
              </div>
              <div className="space-y-1.5">
                <Label>Regra de Transição <span className="text-red-500">*</span> <HelpTooltip text="Selecione a regra que define UF, NCMs, CFOPs e método de cálculo" /></Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={ruleId} onChange={e => setRuleId(e.target.value)}>
                  <option value="">Selecione uma regra</option>
                  {rules.filter(r => r.isActive !== false).map(r => <option key={r.id} value={r.id}>{r.name} ({r.stateFrom})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de Referência <HelpTooltip text="Data-base da transição. Notas anteriores a esta data serão consideradas." /></Label>
                <Input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>O sistema irá: (1) localizar o estoque existente na data-base, (2) identificar NF-es de entrada com ST, (3) calcular crédito proporcional por item conforme a regra selecionada, (4) gerar lotes de crédito no ledger.</span>
            </div>
            <Button onClick={handleRun} disabled={running || !branchId || !ruleId}>
              {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculando...</> : <><Play className="mr-2 h-4 w-4" />Executar Cálculo de Transição</>}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <p className="font-semibold text-slate-800">Histórico de Cálculos de Transição ST</p>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...</div>
            ) : calcs.length === 0 ? (
              <div className="p-8 text-center text-slate-400"><Calculator className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Nenhum cálculo de transição realizado</p></div>
            ) : calcs.map(c => (
              <div key={c.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{c.branch?.name}</p>
                    <p className="text-xs text-slate-500">{c.transitionRule?.name ?? 'Regra não especificada'} — {formatDate(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">{statusBadge(c.status)}</div>
                </div>
                {c.status === 'DONE' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-center border border-blue-100"><p className="text-lg font-bold text-blue-700">{formatCurrency(parseFloat(c.totalIcmsStCredit || '0'))}</p><p className="text-xs text-blue-600">ICMS-ST</p></div>
                    <div className="rounded-xl bg-green-50 p-3 text-center border border-green-100"><p className="text-lg font-bold text-green-700">{formatCurrency(parseFloat(c.totalTransitionCreditGenerated || '0'))}</p><p className="text-xs text-green-600">Crédito Gerado</p></div>
                    <div className="rounded-xl bg-amber-50 p-3 text-center border border-amber-100"><p className="text-lg font-bold text-amber-700">{formatCurrency(parseFloat(c.totalFcpStCredit || '0'))}</p><p className="text-xs text-amber-600">FCP-ST</p></div>
                    <div className="rounded-xl bg-red-50 p-3 text-center border border-red-100"><p className="text-lg font-bold text-red-600">{formatCurrency(parseFloat(c.totalTransitionCreditBlocked || '0'))}</p><p className="text-xs text-red-500">Bloqueado</p></div>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => router.push(`/transicao-st/calculos/${c.id}`)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
