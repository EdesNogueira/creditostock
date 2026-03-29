'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, ShieldCheck, UserCircle2, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { usersApi } from '@/lib/api';
import { useNotify } from '@/lib/use-notify';
import { formatDate } from '@/lib/utils';

interface UserData {
  id: string; name: string; email: string;
  role: string; isActive: boolean; createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ADMIN:   { label: 'Administrador', icon: ShieldCheck, color: 'text-red-600',  bg: 'bg-red-50 border-red-200' },
  ANALYST: { label: 'Analista Fiscal', icon: UserCircle2, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' });
  const [editForm, setEditForm] = useState({ name: '', role: 'ANALYST', isActive: true });
  const notify = useNotify();

  const load = () => {
    setLoading(true);
    usersApi.list()
      .then((d: UserData[]) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.password) { notify.warning('Preencha todos os campos obrigatórios'); return; }
    setSaving(true);
    try {
      await usersApi.create(form);
      setModal(null);
      setForm({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' });
      load();
    } catch (e: unknown) {
      notify.handleError(e, 'Erro ao criar usuário');
    } finally { setSaving(false); }
  };

  const openEdit = (u: UserData) => {
    setEditing(u);
    setEditForm({ name: u.name, role: u.role, isActive: u.isActive });
    setModal('edit');
  };

  const saveEdit = async () => {
    if (!editing || !editForm.name) { notify.warning('Preencha o nome'); return; }
    setSaving(true);
    try {
      await usersApi.update(editing.id, editForm);
      setModal(null);
      setEditing(null);
      load();
    } catch (e: unknown) {
      notify.handleError(e, 'Erro ao atualizar usuário');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u: UserData) => {
    try {
      await usersApi.update(u.id, { isActive: !u.isActive });
      load();
    } catch (e: unknown) { notify.handleError(e, 'Erro ao alterar status'); }
  };

  const deleteUser = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await usersApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    } catch (e: unknown) {
      notify.handleError(e, 'Erro ao excluir usuário');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Header title="Usuários" subtitle="Gerencie o acesso ao sistema" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => { setForm({ name: '', email: '', password: '', role: 'ANALYST', companyId: '' }); setModal('create'); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <Users className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Nenhum usuário cadastrado</p>
            <Button className="mt-4" onClick={() => setModal('create')}><Plus className="mr-2 h-4 w-4" />Criar usuário</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => {
              const cfg = ROLE_CONFIG[u.role];
              const Icon = cfg?.icon ?? UserCircle2;
              const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${u.isActive ? 'border-slate-200 hover:shadow-md' : 'border-slate-100 opacity-60'}`}>
                  {/* Avatar + nome */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${u.isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-300'}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border w-fit mb-4 ${cfg?.bg ?? ''} ${cfg?.color ?? ''}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg?.label ?? u.role}
                  </div>

                  {/* Status + data */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                    <Badge variant={u.isActive ? 'success' : 'secondary'} className="text-xs">
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span>Desde {formatDate(u.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg py-1.5 transition-colors"
                      title={u.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {u.isActive
                        ? <><ToggleRight className="h-3.5 w-3.5" /> Desativar</>
                        : <><ToggleLeft className="h-3.5 w-3.5" /> Ativar</>}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Criar Usuário */}
      {modal === 'create' && (
        <Modal title="Novo Usuário" description="Crie um acesso ao sistema Lastro" onClose={() => setModal(null)}>
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
                  { value: 'ANALYST', label: 'Analista Fiscal', desc: 'Importa e analisa dados', icon: UserCircle2 },
                  { value: 'ADMIN', label: 'Administrador', desc: 'Acesso completo', icon: ShieldCheck },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = form.role === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setForm({ ...form, role: opt.value })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Icon className={`h-4 w-4 mb-1.5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      <p className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</p>
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
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar Usuário */}
      {modal === 'edit' && editing && (
        <Modal title={`Editar: ${editing.name}`} description={editing.email} onClose={() => { setModal(null); setEditing(null); }}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo <span className="text-red-500">*</span></Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ANALYST', label: 'Analista Fiscal', icon: UserCircle2 },
                  { value: 'ADMIN', label: 'Administrador', icon: ShieldCheck },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = editForm.role === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setEditForm({ ...editForm, role: opt.value })}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Status da conta</p>
                <p className="text-xs text-slate-500">{editForm.isActive ? 'Usuário ativo e com acesso' : 'Usuário sem acesso ao sistema'}</p>
              </div>
              <button
                onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                className={`relative w-12 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${editForm.isActive ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
              </Button>
              <Button variant="outline" onClick={() => { setModal(null); setEditing(null); }}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteConfirm && (
        <Modal title="Excluir Usuário" description="Esta ação não pode ser desfeita" onClose={() => setDeleteConfirm(null)} size="sm">
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-medium text-red-800">{deleteConfirm.name}</p>
              <p className="text-xs text-red-600">{deleteConfirm.email}</p>
            </div>
            <p className="text-sm text-slate-600">Tem certeza que deseja excluir este usuário? O acesso será removido imediatamente.</p>
            <div className="flex gap-2">
              <Button
                onClick={deleteUser}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : <><Trash2 className="mr-2 h-4 w-4" />Excluir</>}
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
