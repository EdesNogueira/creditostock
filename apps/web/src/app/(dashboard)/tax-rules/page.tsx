'use client';
import { useEffect, useState } from 'react';
import { Scale, Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { taxRulesApi } from '@/lib/api';

interface TaxRule {
  id: string;
  name: string;
  state: string;
  ncmRange?: string;
  cfopList?: string;
  icmsRate: number;
  isActive: boolean;
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const emptyForm = { name: '', state: 'SP', ncmRange: '', cfopList: '', icmsRate: 18, isActive: true };

export default function TaxRulesPage() {
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    taxRulesApi.list(filterState || undefined)
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterState]);

  const handleSubmit = async () => {
    if (!form.name || !form.state) { alert('Preencha nome e UF'); return; }
    setSaving(true);
    try {
      if (editId) {
        await taxRulesApi.update(editId, form);
      } else {
        await taxRulesApi.create(form);
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      load();
    } catch {
      alert('Erro ao salvar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: TaxRule) => {
    setEditId(rule.id);
    setForm({ name: rule.name, state: rule.state, ncmRange: rule.ncmRange ?? '', cfopList: rule.cfopList ?? '', icmsRate: rule.icmsRate, isActive: rule.isActive });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    await taxRulesApi.remove(id);
    load();
  };

  const handleToggle = async (rule: TaxRule) => {
    await taxRulesApi.update(rule.id, { isActive: !rule.isActive });
    load();
  };

  return (
    <div>
      <Header title="Regras Fiscais" subtitle="Parametrize as alíquotas de ICMS por estado, NCM e CFOP" />
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="">Todos os estados</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-sm text-slate-500">{rules.length} regras</p>
          </div>
          <Button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova Regra
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4" /> {editId ? 'Editar Regra' : 'Nova Regra Fiscal'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome da Regra <span className="text-red-500">*</span></Label>
                  <Input placeholder="Ex: ICMS SP padrão" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>UF <span className="text-red-500">*</span></Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  >
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Alíquota ICMS (%) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.icmsRate}
                    onChange={(e) => setForm({ ...form, icmsRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa de NCM <span className="text-slate-400 text-xs">(opcional)</span></Label>
                  <Input placeholder="Ex: 8471-8473" value={form.ncmRange} onChange={(e) => setForm({ ...form, ncmRange: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CFOPs aplicáveis <span className="text-slate-400 text-xs">(opcional)</span></Label>
                  <Input placeholder="Ex: 5102,6102,1102" value={form.cfopList} onChange={(e) => setForm({ ...form, cfopList: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Ativa</option>
                    <option value="false">Inativa</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : editId ? 'Atualizar Regra' : 'Criar Regra'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Alíquota ICMS</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>CFOPs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma regra fiscal configurada
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{rule.state}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-blue-600">{rule.icmsRate}%</span>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-slate-500">{rule.ncmRange || '—'}</TableCell>
                      <TableCell className="text-sm font-mono text-slate-500">{rule.cfopList || '—'}</TableCell>
                      <TableCell>
                        <button onClick={() => handleToggle(rule)} title="Clique para alternar">
                          {rule.isActive
                            ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Ativa</Badge>
                            : <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inativa</Badge>}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rule)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(rule.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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
