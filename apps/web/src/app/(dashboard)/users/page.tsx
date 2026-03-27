'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, ShieldCheck, UserCircle2, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface UserData { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; }

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ADMIN:   { label: 'Administrador', icon: ShieldCheck, color: 'text-red-600' },
  ANALYST: { label: 'Analista Fiscal', icon: UserCircle2, color: 'text-blue-600' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' });

  const load = () => usersApi.list().then((d: UserData[]) => setUsers(d)).catch(() => setUsers([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.password) return alert('Preencha todos os campos obrigatórios');
    setSaving(true);
    try { await usersApi.create(form); setShowModal(false); setForm({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' }); load(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao criar usuário'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Header title="Usuários" subtitle="Gerencie o acesso ao sistema" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <Users className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Nenhum usuário</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Criar usuário</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => {
              const cfg = ROLE_CONFIG[u.role];
              const Icon = cfg?.icon ?? UserCircle2;
              const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg?.color ?? 'text-slate-600'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg?.label ?? u.role}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.isActive
                        ? <Badge variant="success" className="text-xs">Ativo</Badge>
                        : <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      }
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    Criado em {formatDate(u.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Novo Usuário" description="Crie um acesso ao sistema Lastro" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Ana Lima" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="ana@empresa.com.br" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha <span className="text-red-500">*</span></Label>
              <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ANALYST', label: 'Analista Fiscal', desc: 'Importa, concilia e analisa', icon: UserCircle2 },
                  { value: 'ADMIN', label: 'Administrador', desc: 'Acesso completo', icon: ShieldCheck },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: opt.value })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                        form.role === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1.5 ${form.role === opt.value ? 'text-blue-600' : 'text-slate-400'}`} />
                      <p className={`text-sm font-semibold ${form.role === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={create} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Usuário'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
