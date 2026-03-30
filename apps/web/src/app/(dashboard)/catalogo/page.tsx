'use client';
import { useEffect, useState } from 'react';
import { Package, Search, Plus, Tag, X, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { productsApi } from '@/lib/api';
import { useNotify } from '@/lib/use-notify';

interface Alias { id: string; aliasType: string; aliasValue: string; }
interface Product {
  id: string; sku: string; ean?: string; description: string; ncm?: string;
  unit: string; aliases: Alias[];
  _count?: { stockSnapshotItems: number; nfeItems: number };
}

const UNITS = ['UN', 'CX', 'KG', 'LT', 'MT', 'PC', 'RL', 'DZ', 'PR'];
const emptyForm = { sku: '', ean: '', description: '', ncm: '', unit: 'UN' };
const ALIAS_LABELS: Record<string, string> = {
  supplier_code: 'Cod. Fornecedor',
  ean: 'EAN/Barras',
  internal_code: 'Cod. Interno',
  xml_description: 'Desc. XML',
  sku_normalized: 'SKU Normalizado',
};

export default function CatalogoPage() {
  const notify = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [aliasForm, setAliasForm] = useState({ aliasType: 'supplier_code', aliasValue: '' });

  const load = (q?: string) => {
    setLoading(true);
    productsApi.list(undefined, q ?? (search || undefined))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditProduct(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ sku: p.sku, ean: p.ean ?? '', description: p.description, ncm: p.ncm ?? '', unit: p.unit });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.sku || !form.description) { notify.warning('SKU e descricao obrigatorios'); return; }
    setSaving(true);
    try {
      const data = { sku: form.sku, description: form.description, ean: form.ean || undefined, ncm: form.ncm || undefined, unit: form.unit };
      if (editProduct) await productsApi.update(editProduct.id, data);
      else await productsApi.create(data);
      setShowForm(false); load();
    } catch (e) { notify.handleError(e, 'Erro ao salvar produto'); }
    finally { setSaving(false); }
  };

  const handleBackfill = async () => {
    const tid = notify.loading('Reconstruindo catalogo...', 'Analisando dados importados');
    try {
      const r = await productsApi.backfill();
      notify.update(tid, { type: 'success', title: 'Catalogo reconstruido', description: r.message });
      load();
    } catch { notify.update(tid, { type: 'error', title: 'Erro ao reconstruir catalogo' }); }
  };

  const handleAddAlias = async () => {
    if (!editProduct || !aliasForm.aliasValue) return;
    setSaving(true);
    try {
      await productsApi.createAlias(editProduct.id, aliasForm);
      setAliasForm({ ...aliasForm, aliasValue: '' });
      const updated = await productsApi.get(editProduct.id);
      setEditProduct(updated); load();
    } catch (e) { notify.handleError(e, 'Erro ao adicionar codigo'); }
    finally { setSaving(false); }
  };

  const handleRemoveAlias = async (aliasId: string) => {
    try {
      await productsApi.deleteAlias(aliasId);
      if (editProduct) {
        const updated = await productsApi.get(editProduct.id);
        setEditProduct(updated);
        setForm({ sku: updated.sku, ean: updated.ean ?? '', description: updated.description, ncm: updated.ncm ?? '', unit: updated.unit });
      }
      load();
    } catch (e) { notify.handleError(e, 'Erro ao remover codigo'); }
  };

  return (
    <div>
      <Header title="Catalogo de Produtos" subtitle="Gerencie produtos e seus codigos alternativos" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por SKU ou descricao..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
            </div>
            <Button onClick={() => load()} variant="outline">Buscar</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackfill}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reconstruir Catalogo
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo Produto
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>Unid.</TableHead>
                  <TableHead>Cod. Alt.</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Carregando...</TableCell></TableRow>
                ) : products.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum produto encontrado. Clique em "Reconstruir Catalogo" para gerar a partir dos dados importados.</TableCell></TableRow>
                ) : (
                  products.map(p => (
                    <TableRow key={p.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs font-semibold">{p.sku}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{p.ean || '-'}</TableCell>
                      <TableCell className="max-w-[220px]"><p className="truncate font-medium text-sm">{p.description}</p></TableCell>
                      <TableCell className="font-mono text-xs">{p.ncm || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.unit}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.aliases.slice(0, 2).map(a => (
                            <Badge key={a.id} variant="secondary" className="text-xs"><Tag className="h-2.5 w-2.5 mr-1" />{a.aliasValue}</Badge>
                          ))}
                          {p.aliases.length > 2 && <Badge variant="outline" className="text-xs">+{p.aliases.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{p._count?.stockSnapshotItems ?? 0}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{p._count?.nfeItems ?? 0}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Modal title={editProduct ? `Editar: ${editProduct.sku}` : 'Novo Produto'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SKU <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: PRD-001" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} disabled={!!editProduct} className={editProduct ? 'bg-slate-50' : ''} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descricao <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Notebook 15.6 Intel Core i5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>EAN / Codigo de Barras</Label>
                <Input placeholder="Ex: 7891234567890" value={form.ean} onChange={e => setForm({ ...form, ean: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Input placeholder="Ex: 84713019" value={form.ncm} onChange={e => setForm({ ...form, ncm: e.target.value })} />
              </div>
            </div>

            {editProduct && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Codigos Alternativos</p>
                {editProduct.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {editProduct.aliases.map(a => (
                      <div key={a.id} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                        <span className="text-slate-500">{ALIAS_LABELS[a.aliasType] ?? a.aliasType}:</span>
                        <span className="font-mono font-medium">{a.aliasValue}</span>
                        <button onClick={() => handleRemoveAlias(a.id)} className="ml-1 text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-xs min-w-[130px]" value={aliasForm.aliasType} onChange={e => setAliasForm({ ...aliasForm, aliasType: e.target.value })}>
                    {Object.entries(ALIAS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <Input className="h-9 text-xs flex-1" placeholder="Valor..." value={aliasForm.aliasValue} onChange={e => setAliasForm({ ...aliasForm, aliasValue: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddAlias()} />
                  <Button size="sm" variant="outline" onClick={handleAddAlias} disabled={!aliasForm.aliasValue || saving}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : editProduct ? 'Salvar' : 'Criar Produto'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
