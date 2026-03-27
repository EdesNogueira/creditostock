'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@lastro.com.br');
  const [password, setPassword] = useState('edes123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('lastro_token', data.accessToken);
      router.push('/dashboard');
    } catch {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center">
          <Image src="/lastro-logo.png" alt="Lastro" width={180} height={50} className="object-contain object-left" priority />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Rastreabilidade fiscal de estoque com{' '}
            <span className="text-blue-400">precisão e auditabilidade</span>
          </h2>
          <p className="mt-4 text-slate-400">
            Transforme seu estoque atual em um dossiê auditável com evidências de nota fiscal,
            composição de origens e cálculo de créditos de ICMS.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'SKUs Rastreados', value: '200+' },
              { label: 'NF-es Processadas', value: '100+' },
              { label: 'Crédito Identificado', value: 'R$230k' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-slate-800 p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          © 2024 Lastro. Sistema de rastreabilidade fiscal de estoque.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center mb-8 lg:hidden">
            <Image src="/lastro-logo.png" alt="Lastro" width={130} height={36} className="object-contain object-left" priority />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Contas de acesso</p>
            {[
              { label: 'Admin', email: 'admin@lastro.com.br', password: 'edes123456', color: 'bg-red-50 border-red-100 text-red-700' },
              { label: 'Analista', email: 'gabrielteste@lastro.com.br', password: 'gabriel12345', color: 'bg-blue-50 border-blue-100 text-blue-700' },
            ].map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                className="w-full flex items-center justify-between rounded-lg border bg-white p-2.5 hover:bg-slate-100 transition-colors text-left group"
              >
                <div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${acc.color} mr-2`}>{acc.label}</span>
                  <span className="text-xs font-mono text-slate-600">{acc.email}</span>
                </div>
                <span className="text-xs font-mono text-slate-400 group-hover:text-slate-600">{acc.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
