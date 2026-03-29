'use client';
import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, File, X, Database, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { useNotify } from '@/lib/use-notify';
import { stockApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';

interface PreviewRow {
  row: number; sku: string; description: string;
  quantity: number; unitCost: number; totalCost: number;
  unit: string; errors: string[];
}

interface Snapshot {
  id: string; referenceDate: string; fileName: string; totalItems: number;
  jobStatus: string; importedAt: string; branch?: { name: string };
  _count?: { items: number };
}

interface StockItem {
  id: string; rawSku: string; rawDescription: string; quantity: string;
  unitCost: string; totalCost: string; unit: string;
}

export default function StockPage() {
  const notify = useNotify();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [snapshotItems, setSnapshotItems] = useState<StockItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ snapshotId: string; total: number; errorRows: number; preview: PreviewRow[] } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = () => {
    stockApi.list().then((d: Snapshot[]) => setSnapshots(Array.isArray(d) ? d : [])).catch(() => setSnapshots([]));
  };

  const loadSnapshotItems = async (snapshotId: string) => {
    setSelectedSnapshot(snapshotId);
    setLoadingItems(true);
    try {
      const r = await stockApi.getItems(snapshotId, { limit: 200 });
      setSnapshotItems(r.items ?? []);
    } catch { setSnapshotItems([]); }
    finally { setLoadingItems(false); }
  };

  useEffect(() => { loadSnapshots(); }, []);

  const handleImport = async () => {
    if (!file || !branchId) { notify.warning(!branchId ? 'Selecione uma filial' : 'Selecione um arquivo'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('branchId', branchId); fd.append('referenceDate', referenceDate);
      const res = await stockApi.import(fd);
      setResult(res);
      notify.success('Estoque importado', `${res.total - res.errorRows} itens processados`);
      loadSnapshots();
    } catch (e: unknown) {
      notify.handleError(e, 'Erro ao importar arquivo');
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao importar arquivo');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <Header title="Importar Estoque" subtitle="Importe snapshots de estoque via planilha" />
      <div className="p-4 lg:p-6 space-y-5">
        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Configurar Importação</p>
                <p className="text-xs text-slate-500">CSV, XLSX ou PDF com dados de estoque</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Filial <span className="text-red-500">*</span></Label>
                <BranchSelector value={branchId} onChange={id => setBranchId(id)} placeholder="Selecione a filial" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Referência</Label>
                <Input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} />
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <File className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mt-1">
                    <X className="h-3 w-3" /> Remover
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Upload className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-slate-400">Suporta CSV, XLSX e PDF</p>
                </div>
              )}
            </div>

            {/* Column hint */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Colunas esperadas no arquivo:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'sku', required: true },
                  { name: 'descricao', required: true },
                  { name: 'quantidade', required: true },
                  { name: 'custoUnitario', required: true },
                  { name: 'ean', required: false },
                  { name: 'ncm', required: false },
                  { name: 'unidade', required: false },
                ].map(c => (
                  <span
                    key={c.name}
                    className={`text-xs font-mono px-2 py-0.5 rounded-md flex items-center gap-1 ${c.required ? 'bg-blue-100 text-blue-700' : 'bg-white border border-slate-200 text-slate-500'}`}
                  >
                    {c.name}{c.required && <span className="text-red-500 text-[10px]">*</span>}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">* Campos obrigatórios. Aceita nomes em inglês (sku, description, quantity, unitCost) e português.</p>
              <p className="text-xs text-amber-600 mt-1.5">⚠ PDF: o arquivo deve ter texto selecionável (não escaneado). Suporta o formato &quot;Relatório Posição de Estoque&quot; do RetaguardaGB automaticamente.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <Button onClick={handleImport} disabled={!file || loading || !branchId} className="w-full sm:w-auto">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : <><Upload className="mr-2 h-4 w-4" />Importar Estoque</>}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Importação Concluída</p>
                  <p className="text-xs text-slate-500">ID: <span className="font-mono">{result.snapshotId.slice(0, 12)}...</span></p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-200">
                  <p className="text-2xl font-bold text-slate-800">{formatNumber(result.total)}</p>
                  <p className="text-xs text-slate-500 mt-1">Total de linhas</p>
                </div>
                <div className="rounded-xl bg-green-50 p-4 text-center border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{formatNumber(result.total - result.errorRows)}</p>
                  <p className="text-xs text-green-600 mt-1">Válidas</p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{formatNumber(result.errorRows)}</p>
                  <p className="text-xs text-red-500 mt-1">Com erros</p>
                </div>
              </div>
              {result.preview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Linha', 'SKU', 'Descrição', 'Qtd', 'Custo Unit.', 'Total', 'Status'].map(h => (
                          <th key={h} className="text-left py-2 pr-3 font-medium text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {result.preview.map(row => (
                        <tr key={row.row} className="hover:bg-slate-50">
                          <td className="py-2 pr-3 text-slate-400">{row.row}</td>
                          <td className="py-2 pr-3 font-mono font-semibold text-slate-700">{row.sku}</td>
                          <td className="py-2 pr-3 text-slate-600 max-w-[140px] truncate">{row.description}</td>
                          <td className="py-2 pr-3">{formatNumber(row.quantity)}</td>
                          <td className="py-2 pr-3">{formatCurrency(row.unitCost)}</td>
                          <td className="py-2 pr-3">{formatCurrency(row.totalCost)}</td>
                          <td className="py-2">
                            {row.errors.length === 0
                              ? <Badge variant="success" className="text-xs">OK</Badge>
                              : <Badge variant="destructive" className="text-xs" title={row.errors.join(', ')}>Erro</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing snapshots */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Database className="h-5 w-5 text-slate-600" /></div>
              <div>
                <p className="font-semibold text-slate-900">Snapshots de Estoque Importados</p>
                <p className="text-xs text-slate-500">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum snapshot importado ainda</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {snapshots.map(s => (
                <div key={s.id}>
                  <button
                    onClick={() => selectedSnapshot === s.id ? setSelectedSnapshot(null) : loadSnapshotItems(s.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.fileName}</p>
                      <p className="text-xs text-slate-500">{s.branch?.name ?? ''} — {formatDate(s.referenceDate)} — {s.totalItems} itens</p>
                    </div>
                    <Badge variant={s.jobStatus === 'DONE' ? 'success' : s.jobStatus === 'PROCESSING' ? 'warning' : s.jobStatus === 'FAILED' ? 'destructive' : 'info'} className="text-xs flex-shrink-0">
                      {s.jobStatus === 'DONE' ? 'Pronto' : s.jobStatus === 'PROCESSING' ? 'Processando' : s.jobStatus === 'FAILED' ? 'Falhou' : 'Na fila'}
                    </Badge>
                    <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${selectedSnapshot === s.id ? 'rotate-90' : ''}`} />
                  </button>

                  {selectedSnapshot === s.id && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4">
                      {loadingItems ? (
                        <div className="flex items-center justify-center py-4 text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando itens...</div>
                      ) : snapshotItems.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">Nenhum item encontrado</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200">
                                {['SKU', 'Descrição', 'Qtd', 'Custo Unit.', 'Total', 'Un.'].map(h => (
                                  <th key={h} className="text-left py-2 pr-3 font-medium text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {snapshotItems.slice(0, 50).map(item => (
                                <tr key={item.id} className="hover:bg-white">
                                  <td className="py-2 pr-3 font-mono font-semibold text-slate-700">{item.rawSku}</td>
                                  <td className="py-2 pr-3 text-slate-600 max-w-[200px] truncate">{item.rawDescription}</td>
                                  <td className="py-2 pr-3">{formatNumber(parseFloat(item.quantity))}</td>
                                  <td className="py-2 pr-3">{formatCurrency(parseFloat(item.unitCost))}</td>
                                  <td className="py-2 pr-3 font-semibold">{formatCurrency(parseFloat(item.totalCost))}</td>
                                  <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{item.unit}</Badge></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {snapshotItems.length > 50 && (
                            <p className="text-xs text-slate-400 text-center py-2">Mostrando 50 de {snapshotItems.length} itens</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
