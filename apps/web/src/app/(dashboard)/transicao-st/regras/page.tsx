'use client';
import { useEffect, useState } from 'react';
import { Scale, Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { HelpTooltip } from '@/components/help-tooltip';
import { taxTransitionApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TransitionRule {
  id: string; name: string; description?: string; stateFrom: string; stateTo?: string;
  effectiveFrom: string; effectiveTo?: string; ncmRange?: string; cestList?: string;
  cfopList?: string; cstList?: string; calcMethod: string;
  includeFcpStInCredit: boolean; isActive: boolean; createdAt: string;
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const CALC_METHODS = [
  { value: 'PROPORTIONAL_ST_ONLY', label: 'Proporcional — somente ICMS-ST', desc: 'Calcula crédito com base apenas no ICMS-ST pago' },
  { value: 'PROPORTIONAL_ST_PLUS_FCP', label: 'Proporcional — ICMS-ST + FCP-ST', desc: 'Inclui FCP-ST no cálculo do crédito' },
  { value: 'MANUAL_OVERRIDE', label: 'Manual — revisão necessária', desc: 'Não calcula automaticamente; requer ajuste manual' },
];

const emptyForm = { name: '', description: '', stateFrom: 'SP', stateTo: '', effectiveFrom: '', effectiveTo: '', ncmRange: '', cestList: '', cfopList: '', cstList: '', calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false };

export default function TransicaoRegrasPage() {
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => { taxTransitionApi.listRules().then((d: TransitionRule[]) => setRules(Array.isArray(d) ? d : [])).catch(() => setRules([])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openEdit = (r: TransitionRule) => {
    setEditId(r.id);
    setForm({ name: r.name, description: r.description ?? '', stateFrom: r.stateFrom, stateTo: r.stateTo ?? '', effectiveFrom: r.effectiveFrom?.split('T')[0] ?? '', effectiveTo: r.effectiveTo?.split('T')[0] ?? '', ncmRange: r.ncmRange ?? '', cestList: r.cestList ?? '', cfopList: r.cfopList ?? '', cstList: r.cstList ?? '', calcMethod: r.calcMethod, includeFcpStInCredit: r.includeFcpStInCredit });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.stateFrom || !form.effectiveFrom) return alert('Preencha nome, UF e data de vigência');
    setSaving(true);
    try {
      const payload = { ...form, effectiveTo: form.effectiveTo || undefined, stateTo: form.stateTo || undefined };
      if (editId) { await taxTransitionApi.updateRule(editId, payload); }
      else { await taxTransitionApi.createRule(payload); }
      setModal(null); setEditId(null); setForm(emptyForm); load();
    } catch { alert('Erro ao salvar regra'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Excluir esta regra?')) return; await taxTransitionApi.deleteRule(id); load(); };

  return (
    <div>
      <Header title="Regras de Transição ST" subtitle="Configure as regras para crédito de transição ICMS-ST" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">{rules.length} regra{rules.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => { setEditId(null); setForm(emptyForm); setModal('create'); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova Regra
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...</div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <ArrowRightLeft className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Nenhuma regra de transição configurada</p>
            <p className="text-sm text-slate-500 mt-1">Crie uma regra para calcular créditos de transição ST</p>
            <Button className="mt-4" onClick={() => setModal('create')}><Plus className="mr-2 h-4 w-4" />Criar regra</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.isActive ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Ativa</Badge> : <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inativa</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                  <div><span className="text-slate-500">UF Origem:</span> <span className="font-semibold">{r.stateFrom}</span></div>
                  {r.stateTo && <div><span className="text-slate-500">UF Destino:</span> <span className="font-semibold">{r.stateTo}</span></div>}
                  <div><span className="text-slate-500">Vigência:</span> <span className="font-semibold">{formatDate(r.effectiveFrom)}{r.effectiveTo ? ` — ${formatDate(r.effectiveTo)}` : ' →'}</span></div>
                  <div><span className="text-slate-500">Método:</span> <span className="font-mono">{r.calcMethod === 'PROPORTIONAL_ST_ONLY' ? 'ST only' : r.calcMethod === 'PROPORTIONAL_ST_PLUS_FCP' ? 'ST+FCP' : 'Manual'}</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {r.cfopList && r.cfopList.split(',').map(c => <Badge key={c} variant="outline" className="text-xs font-mono">CFOP {c.trim()}</Badge>)}
                  {r.cstList && r.cstList.split(',').map(c => <Badge key={c} variant="outline" className="text-xs font-mono">CST {c.trim()}</Badge>)}
                  {r.ncmRange && <Badge variant="outline" className="text-xs font-mono">NCM {r.ncmRange}</Badge>}
                  {r.includeFcpStInCredit && <Badge variant="info" className="text-xs">FCP-ST incluso</Badge>}
                </div>
                <div className="flex gap-1.5 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(r)} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                  <span className="text-slate-200">|</span>
                  <button onClick={() => handleDelete(r.id)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={editId ? 'Editar Regra de Transição' : 'Nova Regra de Transição'} description="Configure os parâmetros da transição ST → regime normal" onClose={() => { setModal(null); setEditId(null); }} size="lg">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Nome da Regra <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Transição ST→Normal — SP — Cosméticos" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="Detalhes sobre esta regra..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>UF de Origem <span className="text-red-500">*</span> <HelpTooltip text="Estado do emitente da NF-e de entrada" /></Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={form.stateFrom} onChange={e => setForm({ ...form, stateFrom: e.target.value })}>{STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="space-y-1.5">
                <Label>UF de Destino <HelpTooltip text="Estado do destinatário (opcional)" /></Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={form.stateTo} onChange={e => setForm({ ...form, stateTo: e.target.value })}><option value="">Qualquer</option>{STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Vigência a partir de <span className="text-red-500">*</span></Label><Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Vigência até</Label><Input type="date" value={form.effectiveTo} onChange={e => setForm({ ...form, effectiveTo: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>CFOPs <HelpTooltip text="Lista de CFOPs separados por vírgula. Ex: 6403,5405" /></Label><Input placeholder="6403,5405" value={form.cfopList} onChange={e => setForm({ ...form, cfopList: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>CSTs <HelpTooltip text="Lista de CSTs separados por vírgula. Ex: 10,30,60" /></Label><Input placeholder="10,30,60" value={form.cstList} onChange={e => setForm({ ...form, cstList: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Faixa de NCM <HelpTooltip text="Ex: 33000000-33999999" /></Label><Input placeholder="33000000-33999999" value={form.ncmRange} onChange={e => setForm({ ...form, ncmRange: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>CESTs <HelpTooltip text="Lista de CESTs separados por vírgula" /></Label><Input placeholder="2002800,2001400" value={form.cestList} onChange={e => setForm({ ...form, cestList: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Cálculo <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CALC_METHODS.map(m => (
                  <button key={m.value} type="button" onClick={() => setForm({ ...form, calcMethod: m.value })} className={cn('flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all text-xs', form.calcMethod === m.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}>
                    <p className={cn('font-semibold', form.calcMethod === m.value ? 'text-blue-700' : 'text-slate-700')}>{m.label}</p>
                    <p className="text-slate-500 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div><p className="text-sm font-medium text-slate-700">Incluir FCP-ST no crédito</p><p className="text-xs text-slate-500">Soma o FCP-ST ao valor creditável</p></div>
              <button onClick={() => setForm({ ...form, includeFcpStInCredit: !form.includeFcpStInCredit })} className={cn('relative w-12 h-6 rounded-full transition-colors', form.includeFcpStInCredit ? 'bg-blue-500' : 'bg-slate-300')}><span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', form.includeFcpStInCredit ? 'left-7' : 'left-1')} /></button>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : editId ? 'Salvar Alterações' : 'Criar Regra'}</Button>
            <Button variant="outline" onClick={() => { setModal(null); setEditId(null); }}>Cancelar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
