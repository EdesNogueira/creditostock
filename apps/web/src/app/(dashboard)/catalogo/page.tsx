'use client';
import { useEffect, useState } from 'react';
import { Package, Search, Plus, Tag, X, Loader2, Pencil } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { productsApi } from '@/lib/api';
import { useNotify } from '@/lib/use-notify';
import { RefreshCw } from 'lucide-react';

interface Alias {
  id: string;
  aliasType: string;
  aliasValue: string;
}

interface Product {
  id: string;
  sku: string;
  ean?: string;
  description: string;
  ncm?: string;
  unit: string;
  aliases: Alias[];
  _count?: { stockSnapshotItems: number; nfeItems: number };
}

const UNITS = ['UN', 'CX', 'KG', 'LT', 'MT', 'PC', 'RL', 'DZ', 'PR'];

const emptyForm = { sku: '', ean: '', description: '', ncm: '', unit: 'UN' };

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  // Alias form
  const [aliasForm, setAliasForm] = useState({ aliasType: 'supplier_code', aliasValue: '' });
  const notify = useNotify();

  const load = (q?: string) => {
    setLoading(true);
    productsApi.list(undefined, q ?? (search || undefined))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setAliasForm({ aliasType: 'supplier_code', aliasValue: '' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ sku: p.sku, ean: p.ean ?? '', description: p.description, ncm: p.ncm ?? '', unit: p.unit });
    setAliasForm({ aliasType: 'supplier_code', aliasValue: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.sku || !form.description) { notify.warning('SKU e descriÃ§Ã£o sÃ£o obrigatÃ³rios'); return; }
    setSaving(true);
    try {
      const data = {
        sku: form.sku,
        description: form.description,
        ean: form.ean || undefined,
        ncm: form.ncm || undefined,
        unit: form.unit,
      };
      if (editProduct) {
        await productsApi.update(editProduct.id, data);
      } else {
        await productsApi.create(data);
      }
      setShowForm(false);
      load();
    } catch (e: unknown) {
      notify.handleError(e, 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAlias = async () => {
    if (!editProduct || !aliasForm.aliasValue) return;
    setSaving(true);
    try {
      await productsApi.createAlias(editProduct.id, aliasForm);
      setAliasForm({ ...aliasForm, aliasValue: '' });
      const updated = await productsApi.get(editProduct.id);
      setEditProduct(updated);
      load();
    } catch (e) {
      notify.handleError(e, 'Erro ao adicionar alias');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAlias = async (aliasId: string) => {
    if (!confirm('Remover este alias?')) return;
    try {
      await productsApi.deleteAlias(aliasId);
      if (editProduct) {
        const updated = await productsApi.get(editProduct.id);
        setEditProduct(updated);
        setForm({ sku: updated.sku, ean: updated.ean ?? '', description: updated.description, ncm: updated.ncm ?? '', unit: updated.unit });
      }
      load();
    } catch (e) {
      notify.handleError(e, 'Erro ao remover alias');
    }
  };

  const ALIAS_TYPE_LABELS: Record<string, string> = {
    supplier_code: 'CÃ³d. Fornecedor',
    ean: 'EAN/Barras',
    internal_code: 'CÃ³d. Interno',
    xml_description: 'Desc. XML',
  };

  return (
    <div>
      <Header title="CatÃ¡logo de Produtos" subtitle="Gerencie produtos e seus cÃ³digos alternativos" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por SKU ou descriÃ§Ã£o..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
              />
            </div>
            <Button onClick={() => load()} variant="outline">Buscar</Button>
          </div>
          <Button variant="outline" onClick={async () => {
            const toastId = notify.loading('Reconstruindo catÃ¡logo...', 'Analisando dados importados');
            try {
              const r = await productsApi.backfill();
              notify.update(toastId, { type: 'success', title: 'CatÃ¡logo reconstruÃ­do', description: r.message });
              load();
            } catch { notify.update(toastId, { type: 'error', title: 'Erro ao reconstruir catÃ¡logo' }); }
          }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reconstruir CatÃ¡logo
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead>DescriÃ§Ã£o</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>Unid.</TableHead>
                  <TableHead>CÃ³d. Alt.</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs font-semibold">{p.sku}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{p.ean ?? 'â€”'}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate font-medium text-sm">{p.description}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.ncm ?? 'â€”'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{p.unit}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.aliases.slice(0, 2).map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {a.aliasValue}
                            </Badge>
                          ))}
                          {p.aliases.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{p.aliases.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{p._count?.stockSnapshotItems ?? 0}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{p._count?.nfeItems ?? 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Criar / Editar Produto */}
      {showForm && (
        <Modal
          title={editProduct ? `Editar: ${editProduct.sku}` : 'Novo Produto'}
          onClose={() => setShowForm(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SKU <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Ex: PRD-001"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  disabled={!!editProduct}
                  className={editProduct ? 'bg-slate-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>DescriÃ§Ã£o <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Notebook 15.6 Intel Core i5"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>EAN / CÃ³digo de Barras</Label>
                <Input
                  placeholder="Ex: 7891234567890"
                  value={form.ean}
                  onChange={(e) => setForm({ ...form, ean: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Input
                  placeholder="Ex: 84713019"
                  value={form.ncm}
                  onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                />
              </div>
            </div>

            {/* CÃ³digos alternativos (sÃ³ ao editar) */}
            {editProduct && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">CÃ³digos Alternativos</p>
                {editProduct.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {editProduct.aliases.map((a) => (
                      <div key={a.id} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                        <span className="text-slate-500">{ALIAS_TYPE_LABELS[a.aliasType] ?? a.aliasType}:</span>
                        <span className="font-mono font-medium">{a.aliasValue}</span>
                        <button
                          onClick={() => handleRemoveAlias(a.id)}
                          className="ml-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[130px]"
                    value={aliasForm.aliasType}
                    onChange={(e) => setAliasForm({ ...aliasForm, aliasType: e.target.value })}
                  >
                    {Object.entries(ALIAS_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <Input
                    className="h-9 text-xs flex-1"
                    placeholder="Valor do alias..."
                    value={aliasForm.aliasValue}
                    onChange={(e) => setAliasForm({ ...aliasForm, aliasValue: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddAlias} disabled={!aliasForm.aliasValue || saving}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : editProduct ? 'Salvar AlteraÃ§Ãµes' : 'Criar Produto'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
