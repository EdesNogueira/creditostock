'use client';
import { useEffect, useState } from 'react';
import { Calculator, Play, CheckCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculationsApi } from '@/lib/api';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';

interface Calculation {
  id: string;
  mode: string;
  status: string;
  totalStockCost: string;
  totalIcmsPaid: string;
  potentialCredit: string;
  approvedCredit: string;
  blockedCredit: string;
  reconciledPct: number;
  createdAt: string;
  finishedAt?: string;
  branch: { name: string; cnpj: string };
}

const statusBadge = (s: string) => {
  const map: Record<string, 'info' | 'warning' | 'success' | 'destructive'> = {
    PENDING: 'info',
    RUNNING: 'warning',
    DONE: 'success',
    ERROR: 'destructive',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pendente', RUNNING: 'Executando', DONE: 'Concluído', ERROR: 'Erro',
  };
  return <Badge variant={map[s] ?? 'outline'}>{labels[s] ?? s}</Badge>;
};

const modeBadge = (m: string) => {
  const labels: Record<string, string> = { STRICT: 'Estrito', ASSISTED: 'Assistido', SIMULATION: 'Simulação' };
  return <Badge variant="outline">{labels[m] ?? m}</Badge>;
};

export default function CalculationsPage() {
  const [calcs, setCalcs] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [mode, setMode] = useState('ASSISTED');

  const load = () => {
    calculationsApi.list()
      .then(setCalcs)
      .catch(() => setCalcs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      await calculationsApi.run({ branchId: branchId || 'demo', mode });
      setTimeout(load, 1000);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <Header title="Cálculo de Créditos" subtitle="Execute e acompanhe os cálculos de crédito de ICMS" />
      <div className="p-6 space-y-6">
        {/* Run Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Executar Novo Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>ID da Filial</Label>
                <Input placeholder="ID da filial" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Modo de Cálculo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="ASSISTED">Assistido</option>
                  <option value="STRICT">Estrito</option>
                  <option value="SIMULATION">Simulação</option>
                </select>
              </div>
            </div>
            <Button onClick={handleRun} disabled={running}>
              {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...</> : <><Play className="mr-2 h-4 w-4" /> Executar Cálculo</>}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Cálculos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filial</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custo Estoque</TableHead>
                  <TableHead>ICMS Pago</TableHead>
                  <TableHead>Crédito Potencial</TableHead>
                  <TableHead>Crédito Aprovado</TableHead>
                  <TableHead>% Conciliado</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : calcs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum cálculo realizado
                    </TableCell>
                  </TableRow>
                ) : (
                  calcs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{c.branch.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{c.branch.cnpj}</p>
                      </TableCell>
                      <TableCell>{modeBadge(c.mode)}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(c.totalStockCost))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(c.totalIcmsPaid))}</TableCell>
                      <TableCell className="font-semibold text-blue-600">{formatCurrency(parseFloat(c.potentialCredit))}</TableCell>
                      <TableCell className="font-semibold text-green-600">{formatCurrency(parseFloat(c.approvedCredit))}</TableCell>
                      <TableCell>
                        <Badge variant={c.reconciledPct >= 80 ? 'success' : c.reconciledPct >= 50 ? 'warning' : 'destructive'}>
                          {formatPercent(c.reconciledPct)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(c.createdAt)}</TableCell>
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
