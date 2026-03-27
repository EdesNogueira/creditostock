'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { nfeApi } from '@/lib/api';

interface ImportResult {
  file: string;
  status: 'queued' | 'duplicate' | 'error';
  documentId?: string;
  message?: string;
}

export default function NfePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('branchId', branchId);
      const res = await nfeApi.importXmls(fd);
      setResults(res.results);
    } catch {
      setResults(files.map((f) => ({ file: f.name, status: 'error' as const, message: 'Falha na importação' })));
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'queued') return <Badge variant="success">Enfileirado</Badge>;
    if (s === 'duplicate') return <Badge variant="warning">Duplicado</Badge>;
    return <Badge variant="destructive">Erro</Badge>;
  };

  return (
    <div>
      <Header title="Importar NF-e XML" subtitle="Importe arquivos XML de notas fiscais em lote" />
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" /> Importação em Lote de XML NF-e
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label>Filial</Label>
              <BranchSelector value={branchId} onChange={(id) => setBranchId(id)} placeholder="Selecione a filial" required />
            </div>

            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <input ref={fileRef} type="file" accept=".xml" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Arraste arquivos XML ou clique para selecionar</p>
              <p className="text-sm text-slate-500 mt-1">Suporta múltiplos arquivos XML de NF-e</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{files.length} arquivo(s) selecionado(s):</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm truncate max-w-[300px]">{f.name}</span>
                        <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleImport} disabled={files.length === 0 || loading} className="w-full md:w-auto">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : <><Upload className="mr-2 h-4 w-4" /> Importar {files.length} arquivo(s)</>}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" /> Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{results.filter((r) => r.status === 'queued').length}</p>
                  <p className="text-xs text-slate-500">Enfileirados</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3 text-center">
                  <p className="text-xl font-bold text-yellow-600">{results.filter((r) => r.status === 'duplicate').length}</p>
                  <p className="text-xs text-slate-500">Duplicados</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{results.filter((r) => r.status === 'error').length}</p>
                  <p className="text-xs text-slate-500">Erros</p>
                </div>
              </div>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-mono">{r.file}</span>
                      {r.message && <span className="text-xs text-red-600">— {r.message}</span>}
                    </div>
                    {statusBadge(r.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
