'use client';
import { useEffect, useState } from 'react';
import { Package, Search, Plus, Tag } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { productsApi } from '@/lib/api';

interface Product {
  id: string;
  sku: string;
  ean?: string;
  description: string;
  ncm?: string;
  unit: string;
  aliases: { id: string; aliasType: string; aliasValue: string }[];
  _count?: { stockSnapshotItems: number; nfeItems: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    productsApi.list(undefined, search || undefined)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Header title="Catálogo de Produtos" subtitle="Gerencie produtos e seus aliases de identificação" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por SKU ou descrição..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <Button onClick={load} variant="outline">Buscar</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>Unid.</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>NF-e</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer">
                      <TableCell className="font-mono text-xs font-semibold">{p.sku}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{p.ean ?? '—'}</TableCell>
                      <TableCell className="max-w-[250px]">
                        <p className="truncate font-medium">{p.description}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.ncm ?? '—'}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.aliases.slice(0, 2).map((a) => (
                            <Badge key={a.id} variant="outline" className="text-xs">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {a.aliasValue}
                            </Badge>
                          ))}
                          {p.aliases.length > 2 && (
                            <Badge variant="secondary" className="text-xs">+{p.aliases.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{p._count?.stockSnapshotItems ?? 0}</TableCell>
                      <TableCell>{p._count?.nfeItems ?? 0}</TableCell>
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
