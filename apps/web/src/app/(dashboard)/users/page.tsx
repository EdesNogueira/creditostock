'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, Loader2, ShieldCheck, User } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleBadge = (role: string) => {
  if (role === 'ADMIN') return <Badge variant="destructive"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
  if (role === 'ANALYST') return <Badge variant="info"><User className="h-3 w-3 mr-1" />Analista</Badge>;
  return <Badge variant="outline">{role}</Badge>;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' });

  const load = () => {
    usersApi.list()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { alert('Preencha todos os campos obrigatórios'); return; }
    setSaving(true);
    try {
      await usersApi.create(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message ?? 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Usuários" subtitle="Gerencie os usuários com acesso ao sistema" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">{users.length} usuário(s)</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Criar Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome <span className="text-red-500">*</span></Label>
                  <Input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail <span className="text-red-500">*</span></Label>
                  <Input type="email" placeholder="usuario@empresa.com.br" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Senha <span className="text-red-500">*</span></Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="ANALYST">Analista Fiscal</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                <strong>Analista:</strong> pode importar e conciliar dados. <strong>Admin:</strong> acesso completo incluindo aprovação de dossiês e configuração do sistema.
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Usuário'}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Carregando...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum usuário
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{u.email}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell>
                        {u.isActive
                          ? <Badge variant="success">Ativo</Badge>
                          : <Badge variant="secondary">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(u.createdAt)}</TableCell>
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
