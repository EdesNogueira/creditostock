'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { nfeApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ImportResult { file: string; status: 'queued'|'duplicate'|'error'; documentId?: string; message?: string; }

export default function NfePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...Array.from(list).filter(f => !names.has(f.name))]; });
  };

  const handleImport = async () => {
    if (!files.length || !branchId) return;
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      fd.append('branchId', branchId);
      setResults((await nfeApi.importXmls(fd)).results);
      setFiles([]);
    } catch {
      setResults(files.map(f => ({ file: f.name, status: 'error' as const, message: 'Falha na importação' })));
    } finally { setLoading(false); }
  };

  const queued = results.filter(r => r.status === 'queued').length;
  const dupes = results.filter(r => r.status === 'duplicate').length;
  const errors = results.filter(r => r.status === 'error').length;

  return (
    <div>
      <Header title="Importar NF-e XML" subtitle="Importe arquivos XML de notas fiscais em lote" />
      <div className="p-4 lg:p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Importação em Lote de XML NF-e</p>
                <p className="text-xs text-slate-500">Selecione múltiplos arquivos XML</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="max-w-sm space-y-1.5">
              <Label>Filial <span className="text-red-500">*</span></Label>
              <BranchSelector value={branchId} onChange={id => setBranchId(id)} placeholder="Selecione a filial" />
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
                files.length > 0 ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-green-300 hover:bg-slate-50',
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <input ref={fileRef} type="file" accept=".xml" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Upload className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">Arraste arquivos XML ou clique</p>
              <p className="text-xs text-slate-400 mt-1">Suporta múltiplos arquivos NF-e em XML</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{files.length} arquivo(s) selecionado(s)</p>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{(f.size/1024).toFixed(1)}KB</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleImport} disabled={!files.length || loading || !branchId} className="w-full sm:w-auto">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : <><Upload className="mr-2 h-4 w-4" />Importar {files.length || ''} arquivo(s)</>}
            </Button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-slate-900">Resultado da Importação</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Enfileirados', value: queued, color: 'bg-green-50 border-green-200 text-green-700' },
                  { label: 'Duplicados', value: dupes, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { label: 'Erros', value: errors, color: 'bg-red-50 border-red-200 text-red-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl border border-slate-100 bg-slate-50">
                    {r.status === 'queued' ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      : r.status === 'duplicate' ? <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    <span className="text-sm font-mono text-slate-700 truncate flex-1">{r.file}</span>
                    {r.message && <span className="text-xs text-red-600 flex-shrink-0">{r.message}</span>}
                    <Badge variant={r.status === 'queued' ? 'success' : r.status === 'duplicate' ? 'warning' : 'destructive'} className="text-xs flex-shrink-0">
                      {r.status === 'queued' ? 'Processando' : r.status === 'duplicate' ? 'Duplicado' : 'Erro'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
