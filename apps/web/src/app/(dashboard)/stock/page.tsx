'use client';
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { stockApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';

interface PreviewRow {
  row: number;
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  errors: string[];
}

export default function StockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState('');
  const [referenceDate, setReferenceDate] = useState('2024-12-31');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ snapshotId: string; total: number; errorRows: number; preview: PreviewRow[] } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('branchId', branchId || 'demo-branch-id');
      fd.append('referenceDate', referenceDate);
      const res = await stockApi.import(fd);
      setResult(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Importar Estoque" subtitle="Importe o snapshot de estoque via CSV ou XLSX" />
      <div className="p-6 space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Configurar Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>ID da Filial</Label>
                <Input
                  placeholder="ID da filial (ex: cuid)"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Referência</Label>
                <Input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              {file ? (
                <div>
                  <p className="font-medium text-slate-700">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-slate-700">Arraste um arquivo ou clique para selecionar</p>
                  <p className="text-sm text-slate-500 mt-1">Suporta CSV e XLSX</p>
                </div>
              )}
            </div>

            {/* Format hint */}
            <div className="rounded-md bg-blue-50 border border-blue-100 p-4 text-sm">
              <p className="font-medium text-blue-800 mb-2">Colunas esperadas no arquivo:</p>
              <div className="flex flex-wrap gap-2">
                {['sku', 'description', 'quantity', 'unitCost', 'ean (opcional)', 'ncm (opcional)', 'unit (opcional)'].map((c) => (
                  <span key={c} className="font-mono bg-white border rounded px-2 py-0.5 text-xs text-blue-700">{c}</span>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <Button onClick={handleImport} disabled={!file || loading} className="w-full md:w-auto">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : <><Upload className="mr-2 h-4 w-4" /> Importar Estoque</>}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" /> Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(result.total)}</p>
                  <p className="text-xs text-slate-500">Total de linhas</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{formatNumber(result.total - result.errorRows)}</p>
                  <p className="text-xs text-slate-500">Válidas</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{formatNumber(result.errorRows)}</p>
                  <p className="text-xs text-slate-500">Com erros</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">Prévia das primeiras linhas importadas:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo Unit.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.preview.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell className="text-slate-500">{row.row}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                      <TableCell>{formatNumber(row.quantity)}</TableCell>
                      <TableCell>{formatCurrency(row.unitCost)}</TableCell>
                      <TableCell>{formatCurrency(row.totalCost)}</TableCell>
                      <TableCell>
                        {row.errors.length === 0 ? (
                          <Badge variant="success">OK</Badge>
                        ) : (
                          <Badge variant="destructive" title={row.errors.join(', ')}>Erro</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
