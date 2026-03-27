'use client';
import { useEffect, useState } from 'react';
import {
  Building2, Plus, MapPin, Users, Pencil, X, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { companiesApi, branchesApi } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  cnpj?: string;
  city?: string;
  state?: string;
  address?: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  tradeName?: string;
  branches: Branch[];
  _count?: { users: number };
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modals
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState<string | null>(null); // company id
  const [showBranchDetail, setShowBranchDetail] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);

  // Company form
  const [cForm, setCForm] = useState({ name: '', cnpj: '', tradeName: '' });
  // Branch form
  const [bForm, setBForm] = useState({ name: '', cnpj: '', address: '', city: '', state: 'SP' });

  const load = () => {
    setLoading(true);
    companiesApi.list()
      .then((data) => {
        setCompanies(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setExpanded(new Set(data.map((c: Company) => c.id)));
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateCompany = async () => {
    if (!cForm.name || !cForm.cnpj) { alert('Preencha nome e CNPJ'); return; }
    setSaving(true);
    try {
      await companiesApi.create(cForm);
      setShowCompanyForm(false);
      setCForm({ name: '', cnpj: '', tradeName: '' });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message ?? 'Erro ao criar empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async (companyId: string) => {
    if (!bForm.name || !bForm.cnpj) { alert('Preencha nome e CNPJ da filial'); return; }
    setSaving(true);
    try {
      await branchesApi.create({ ...bForm, companyId });
      setShowBranchForm(null);
      setBForm({ name: '', cnpj: '', address: '', city: '', state: 'SP' });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message ?? 'Erro ao criar filial');
    } finally {
      setSaving(false);
    }
  };

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3/$4')
      .replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3')
      .replace(/^(\d{2})(\d{3})$/, '$1.$2')
      .replace(/^(\d{2})$/, '$1');
  };

  return (
    <div>
      <Header title="Empresas & Filiais" subtitle="Gerencie as empresas e suas filiais no sistema" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowCompanyForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-xl">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma empresa cadastrada</p>
            <p className="text-sm mt-1">Clique em "Nova Empresa" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => (
              <Card key={company.id} className="overflow-hidden">
                <CardHeader className="pb-0 pt-4">
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center gap-3 text-left group"
                      onClick={() => toggleExpand(company.id)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-blue-600 transition-colors">{company.name}</CardTitle>
                        <p className="text-sm text-slate-500">{company.tradeName ?? company.cnpj}</p>
                      </div>
                      {expanded.has(company.id)
                        ? <ChevronDown className="h-4 w-4 text-slate-400 ml-2" />
                        : <ChevronRight className="h-4 w-4 text-slate-400 ml-2" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        {company._count?.users ?? 0} usuários
                      </Badge>
                      <Badge variant="success">{company.branches.length} filiais</Badge>
                    </div>
                  </div>
                </CardHeader>

                {expanded.has(company.id) && (
                  <CardContent className="pt-4">
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead>Filial</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {company.branches.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-400 py-6">
                                Nenhuma filial cadastrada para esta empresa
                              </TableCell>
                            </TableRow>
                          ) : (
                            company.branches.map((branch) => (
                              <TableRow key={branch.id}>
                                <TableCell className="font-medium">{branch.name}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">
                                  {branch.cnpj ?? branch.id.slice(0, 8) + '...'}
                                </TableCell>
                                <TableCell>
                                  {branch.city && (
                                    <span className="flex items-center gap-1 text-sm text-slate-600">
                                      <MapPin className="h-3 w-3" />
                                      {branch.city}, {branch.state}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => setShowBranchDetail(branch)}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" /> Ver detalhes
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setBForm({ name: '', cnpj: '', address: '', city: '', state: 'SP' }); setShowBranchForm(company.id); }}
                    >
                      <Plus className="mr-2 h-3 w-3" /> Adicionar Filial
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova Empresa */}
      {showCompanyForm && (
        <Modal title="Nova Empresa" onClose={() => setShowCompanyForm(false)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Razão Social <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Distribuidora ABC Ltda"
                value={cForm.name}
                onChange={(e) => setCForm({ ...cForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ <span className="text-red-500">*</span></Label>
              <Input
                placeholder="00.000.000/0001-00"
                value={cForm.cnpj}
                onChange={(e) => setCForm({ ...cForm, cnpj: formatCnpj(e.target.value) })}
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Input
                placeholder="Ex: Distribuidora ABC"
                value={cForm.tradeName}
                onChange={(e) => setCForm({ ...cForm, tradeName: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateCompany} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Empresa'}
              </Button>
              <Button variant="outline" onClick={() => setShowCompanyForm(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Adicionar Filial */}
      {showBranchForm && (
        <Modal title="Adicionar Filial" onClose={() => setShowBranchForm(null)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Filial <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Filial São Paulo"
                value={bForm.name}
                onChange={(e) => setBForm({ ...bForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ da Filial <span className="text-red-500">*</span></Label>
              <Input
                placeholder="00.000.000/0002-00"
                value={bForm.cnpj}
                onChange={(e) => setBForm({ ...bForm, cnpj: formatCnpj(e.target.value) })}
                maxLength={18}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="Ex: São Paulo" value={bForm.city} onChange={(e) => setBForm({ ...bForm, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bForm.state}
                  onChange={(e) => setBForm({ ...bForm, state: e.target.value })}
                >
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Input placeholder="Ex: Av. Paulista, 1000" value={bForm.address} onChange={(e) => setBForm({ ...bForm, address: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleCreateBranch(showBranchForm)} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Adicionar Filial'}
              </Button>
              <Button variant="outline" onClick={() => setShowBranchForm(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Ver detalhes da filial */}
      {showBranchDetail && (
        <Modal title="Detalhes da Filial" onClose={() => setShowBranchDetail(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nome</p>
                <p className="font-medium">{showBranchDetail.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">CNPJ</p>
                <p className="font-mono text-sm">{showBranchDetail.cnpj ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Cidade</p>
                <p>{showBranchDetail.city ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">UF</p>
                <p>{showBranchDetail.state ?? '—'}</p>
              </div>
              {showBranchDetail.address && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Endereço</p>
                  <p>{showBranchDetail.address}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">ID Interno</p>
                <p className="font-mono text-xs text-slate-400">{showBranchDetail.id}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowBranchDetail(null)} className="w-full mt-2">Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
