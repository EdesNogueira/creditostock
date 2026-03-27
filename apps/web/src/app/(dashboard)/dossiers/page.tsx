'use client';
import { useEffect, useState } from 'react';
import { FolderOpen, Plus, CheckCircle2, XCircle, Download, Loader2, Clock, FileText } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { BranchSelector } from '@/components/branch-selector';
import { dossiersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Dossier {
  id: string; title: string; status: string; notes?: string;
  createdAt: string; approvedAt?: string; branch: { name: string };
}

const STATUS: Record<string, { label: string; variant: 'secondary'|'warning'|'success'|'destructive'; icon: React.ElementType }> = {
  DRAFT:          { label: 'Rascunho',   variant: 'secondary',   icon: FileText },
  PENDING_REVIEW: { label: 'Em revisão', variant: 'warning',     icon: Clock },
  APPROVED:       { label: 'Aprovado',   variant: 'success',     icon: CheckCircle2 },
  REJECTED:       { label: 'Rejeitado',  variant: 'destructive', icon: XCircle },
};

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const load = () => dossiersApi.list().then(setDossiers).catch(() => setDossiers([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !branchId) return alert('Preencha título e filial');
    setSaving(true);
    try { await dossiersApi.create({ branchId, title, notes }); setShowModal(false); setTitle(''); setNotes(''); setBranchId(''); load(); }
    catch { alert('Erro ao criar dossiê'); }
    finally { setSaving(false); }
  };

  const handleDownload = (id: string) => {
    const token = localStorage.getItem('lastro_token') || localStorage.getItem('creditostock_token');
    const url = dossiersApi.exportUrl(id);
    const a = document.createElement('a');
    a.href = `${url}?token=${token}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <Header title="Dossiês" subtitle="Documentação fiscal para protocolo de créditos de ICMS" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Dossiê
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : dossiers.length === 0 ? (
          <div className="flex flex-col items-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="h-7 w-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">Nenhum dossiê criado</p>
            <p className="text-sm text-slate-500 mt-1">Crie o primeiro dossiê de crédito fiscal</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Criar dossiê</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {dossiers.map(d => {
              const st = STATUS[d.status];
              const Icon = st?.icon ?? FileText;
              return (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', {
                        'bg-slate-100': d.status === 'DRAFT',
                        'bg-amber-50': d.status === 'PENDING_REVIEW',
                        'bg-green-50': d.status === 'APPROVED',
                        'bg-red-50': d.status === 'REJECTED',
                      })}>
                        <Icon className={cn('h-5 w-5', {
                          'text-slate-400': d.status === 'DRAFT',
                          'text-amber-500': d.status === 'PENDING_REVIEW',
                          'text-green-600': d.status === 'APPROVED',
                          'text-red-500': d.status === 'REJECTED',
                        })} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{d.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{d.branch?.name}</p>
                      </div>
                    </div>
                    <Badge variant={st?.variant ?? 'outline'} className="flex-shrink-0 text-xs">
                      {st?.label ?? d.status}
                    </Badge>
                  </div>

                  {d.notes && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 bg-slate-50 rounded-lg p-2.5">{d.notes}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Criado em {formatDate(d.createdAt)}</span>
                    {d.approvedAt && <span>Aprovado em {formatDate(d.approvedAt)}</span>}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleDownload(d.id)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
                    </Button>
                    {d.status === 'PENDING_REVIEW' && (
                      <>
                        <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => dossiersApi.approve(d.id).then(load)}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => dossiersApi.reject(d.id).then(load)}>
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Novo Dossiê" description="Gere um dossiê fiscal de crédito de ICMS" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Dossiê ICMS Dez/2024 — Filial SP" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Filial <span className="text-red-500">*</span></Label>
              <BranchSelector value={branchId} onChange={id => setBranchId(id)} placeholder="Selecione a filial" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações <span className="text-xs text-slate-400 font-normal">(opcional)</span></Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Informações adicionais sobre o dossiê..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              Ao criar, o sistema irá gerar o dossiê com todos os itens conciliados da filial selecionada.
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving || !title || !branchId} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Dossiê'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
