'use client';
import { useEffect, useState } from 'react';
import { FolderOpen, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dossiersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Dossier {
  id: string;
  title: string;
  status: string;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  branch: { name: string };
}

const statusBadge = (s: string) => {
  const map: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
    DRAFT: 'secondary',
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
  };
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho', PENDING_REVIEW: 'Em revisão', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
  };
  return <Badge variant={map[s] ?? 'outline'}>{labels[s] ?? s}</Badge>;
};

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const load = () => {
    dossiersApi.list()
      .then(setDossiers)
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await dossiersApi.create({ branchId: branchId || 'demo', title, notes });
      setShowForm(false);
      setTitle(''); setNotes('');
      load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Header title="Dossiês" subtitle="Documentação para aprovação de créditos fiscais" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div />
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Dossiê
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar Dossiê</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input placeholder="Ex: Dossiê ICMS Dez/2024" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ID da Filial</Label>
                  <Input placeholder="ID da filial" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Observações sobre este dossiê..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!title || creating}>
                  {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Dossiê'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Aprovado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : dossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum dossiê criado
                    </TableCell>
                  </TableRow>
                ) : (
                  dossiers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>{d.branch.name}</TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{d.notes ?? '—'}</TableCell>
                      <TableCell className="text-sm">{formatDate(d.createdAt)}</TableCell>
                      <TableCell className="text-sm">{d.approvedAt ? formatDate(d.approvedAt) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.status === 'PENDING_REVIEW' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => dossiersApi.approve(d.id).then(load)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => dossiersApi.reject(d.id).then(load)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
