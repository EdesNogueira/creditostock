'use client';
import { useEffect, useState } from 'react';
import { Building2, Plus, MapPin, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { companiesApi, branchesApi } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  cnpj: string;
  tradeName?: string;
  branches: { id: string; name: string; city?: string; state?: string }[];
  _count?: { users: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companiesApi.list()
      .then(setCompanies)
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Empresas & Filiais" subtitle="Gerencie as empresas e suas filiais no sistema" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{company.name}</CardTitle>
                        <p className="text-sm text-slate-500">{company.tradeName ?? company.cnpj}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        {company._count?.users ?? 0} usuários
                      </Badge>
                      <Badge variant="success">{company.branches.length} filiais</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filial</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {company.branches.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-slate-400 py-4">
                              Nenhuma filial cadastrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          company.branches.map((branch) => (
                            <TableRow key={branch.id}>
                              <TableCell className="font-medium">{branch.name}</TableCell>
                              <TableCell className="font-mono text-xs text-slate-500">{branch.id.slice(0, 8)}...</TableCell>
                              <TableCell>
                                {branch.city && (
                                  <span className="flex items-center gap-1 text-sm text-slate-600">
                                    <MapPin className="h-3 w-3" />
                                    {branch.city}, {branch.state}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">Ver detalhes</Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="mr-2 h-3 w-3" /> Adicionar Filial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
