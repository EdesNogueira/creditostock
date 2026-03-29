'use client';
import { useEffect, useState } from 'react';
import { Building2, Plus, MapPin, Users, ChevronDown, ChevronRight, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { companiesApi, branchesApi } from '@/lib/api';

interface Branch { id: string; name: string; cnpj?: string; city?: string; state?: string; address?: string; }
interface Company { id: string; name: string; cnpj: string; tradeName?: string; branches: Branch[]; _count?: { users: number }; }

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function maskCnpj(v: string) {
  const d = v.replace(/\D/g,'').slice(0,14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/,'$1.$2.$3/$4')
    .replace(/^(\d{2})(\d{3})(\d{3})$/,'$1.$2.$3')
    .replace(/^(\d{2})(\d{3})$/,'$1.$2').replace(/^(\d{2})$/,'$1');
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'company' | 'branch' | 'editCompany' | 'editBranch' | null>(null);
  const [activeCo, setActiveCo] = useState<string | null>(null);
  const [editingCoId, setEditingCoId] = useState<string | null>(null);
  const [editingBrId, setEditingBrId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cForm, setCForm] = useState({ name: '', cnpj: '', tradeName: '' });
  const [bForm, setBForm] = useState({ name: '', cnpj: '', city: '', state: 'SP', address: '' });

  const load = () => {
    setLoading(true);
    companiesApi.list()
      .then((d: Company[]) => { setCompanies(d); if (d.length) setExpanded(new Set(d.map(c => c.id))); })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createCompany = async () => {
    if (!cForm.name || !cForm.cnpj) return alert('Preencha nome e CNPJ');
    setSaving(true);
    try { await companiesApi.create(cForm); setModal(null); setCForm({ name: '', cnpj: '', tradeName: '' }); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro'); }
    finally { setSaving(false); }
  };

  const createBranch = async () => {
    if (!bForm.name || !bForm.cnpj || !activeCo) return alert('Preencha nome e CNPJ');
    setSaving(true);
    try { await branchesApi.create({ ...bForm, companyId: activeCo }); setModal(null); setBForm({ name: '', cnpj: '', city: '', state: 'SP', address: '' }); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro'); }
    finally { setSaving(false); }
  };

  const updateCompany = async () => {
    if (!editingCoId || !cForm.name) return alert('Preencha o nome');
    setSaving(true);
    try { await companiesApi.update(editingCoId, cForm); setModal(null); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  const deleteCompany = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${name}"? Todas as filiais serão removidas.`)) return;
    try { await companiesApi.update(id, { deleted: true }); load(); }
    catch { alert('Erro ao excluir empresa. Verifique se não há dados vinculados.'); }
  };

  const updateBranch = async () => {
    if (!editingBrId || !bForm.name) return alert('Preencha o nome');
    setSaving(true);
    try { await branchesApi.update(editingBrId, bForm); setModal(null); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  const deleteBranch = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a filial "${name}"?`)) return;
    try { await branchesApi.update(id, { deleted: true }); load(); }
    catch { alert('Erro ao excluir filial. Verifique se não há dados vinculados.'); }
  };

  return (
    <div>
      <Header title="Empresas & Filiais" subtitle="Gerencie empresas e estabelecimentos" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { setCForm({ name: '', cnpj: '', tradeName: '' }); setModal('company'); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">Nenhuma empresa cadastrada</p>
            <p className="text-sm text-slate-500 mt-1">Clique em "Nova Empresa" para começar</p>
            <Button className="mt-4" onClick={() => setModal('company')}><Plus className="mr-2 h-4 w-4" />Criar empresa</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map(co => (
              <div key={co.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                {/* Company header */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/80 transition-colors"
                  onClick={() => toggle(co.id)}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 flex-shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{co.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{co.tradeName ?? co.cnpj}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs hidden sm:flex gap-1">
                      <Users className="h-3 w-3" />{co._count?.users ?? 0}
                    </Badge>
                    <Badge variant="success" className="text-xs">{co.branches.length} filiais</Badge>
                    {expanded.has(co.id) ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>
                <div className="absolute top-3 right-16 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCoId(co.id); setCForm({ name: co.name, cnpj: co.cnpj, tradeName: co.tradeName ?? '' }); setModal('editCompany'); }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Editar empresa"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCompany(co.id, co.name); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Excluir empresa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {expanded.has(co.id) && (
                  <div className="border-t border-slate-100">
                    {co.branches.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">Nenhuma filial cadastrada</div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {co.branches.map(br => (
                          <div key={br.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{br.name}</p>
                              {br.city && <p className="text-xs text-slate-400">{br.city} — {br.state}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => { setEditingBrId(br.id); setActiveCo(co.id); setBForm({ name: br.name, cnpj: br.cnpj ?? '', city: br.city ?? '', state: br.state ?? 'SP', address: br.address ?? '' }); setModal('editBranch'); }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                              >
                                <Pencil className="h-3 w-3" /> Editar
                              </button>
                              <button
                                onClick={() => deleteBranch(br.id, br.name)}
                                className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-5 py-3 border-t border-slate-100">
                      <button
                        onClick={() => { setActiveCo(co.id); setBForm({ name: '', cnpj: '', city: '', state: 'SP', address: '' }); setModal('branch'); }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar filial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova Empresa */}
      {modal === 'company' && (
        <Modal title="Nova Empresa" description="Cadastre uma nova empresa no sistema" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Razão Social <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Distribuidora ABC Ltda" value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ <span className="text-red-500">*</span></Label>
              <Input placeholder="00.000.000/0001-00" value={cForm.cnpj} onChange={e => setCForm({ ...cForm, cnpj: maskCnpj(e.target.value) })} maxLength={18} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia <span className="text-xs text-slate-400 font-normal">(opcional)</span></Label>
              <Input placeholder="Ex: Distribuidora ABC" value={cForm.tradeName} onChange={e => setCForm({ ...cForm, tradeName: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createCompany} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Empresa'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova Filial */}
      {modal === 'branch' && (
        <Modal title="Adicionar Filial" description="Cadastre um novo estabelecimento" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nome da Filial <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: Filial São Paulo" value={bForm.name} onChange={e => setBForm({ ...bForm, name: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>CNPJ <span className="text-red-500">*</span></Label>
                <Input placeholder="00.000.000/0002-00" value={bForm.cnpj} onChange={e => setBForm({ ...bForm, cnpj: maskCnpj(e.target.value) })} maxLength={18} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Ex: São Paulo" value={bForm.city} onChange={e => setBForm({ ...bForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={bForm.state} onChange={e => setBForm({ ...bForm, state: e.target.value })}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Endereço <span className="text-xs text-slate-400 font-normal">(opcional)</span></Label>
                <Input placeholder="Ex: Av. Paulista, 1000" value={bForm.address} onChange={e => setBForm({ ...bForm, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createBranch} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Adicionar Filial'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar Empresa */}
      {modal === 'editCompany' && (
        <Modal title="Editar Empresa" description="Atualize os dados da empresa" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Razão Social <span className="text-red-500">*</span></Label>
              <Input value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={cForm.cnpj} onChange={e => setCForm({ ...cForm, cnpj: maskCnpj(e.target.value) })} maxLength={18} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={cForm.tradeName} onChange={e => setCForm({ ...cForm, tradeName: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={updateCompany} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar Filial */}
      {modal === 'editBranch' && (
        <Modal title="Editar Filial" description="Atualize os dados da filial" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da Filial <span className="text-red-500">*</span></Label>
              <Input value={bForm.name} onChange={e => setBForm({ ...bForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={bForm.cnpj} onChange={e => setBForm({ ...bForm, cnpj: maskCnpj(e.target.value) })} maxLength={18} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={bForm.city} onChange={e => setBForm({ ...bForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={bForm.state} onChange={e => setBForm({ ...bForm, state: e.target.value })}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input value={bForm.address} onChange={e => setBForm({ ...bForm, address: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={updateBranch} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
