'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@creditostock.com.br');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('creditostock_token', data.accessToken);
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
            <Package className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">CreditoStock</span>
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
          © 2024 CreditoStock. Sistema de rastreabilidade fiscal de estoque.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">CreditoStock</span>
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

          <div className="mt-6 rounded-lg bg-slate-50 border p-4 text-sm">
            <p className="font-medium text-slate-700 mb-2">Credenciais de demonstração:</p>
            <p className="text-slate-600">
              <span className="font-mono bg-white px-1 rounded border text-xs">admin@creditostock.com.br</span>
            </p>
            <p className="text-slate-600 mt-1">
              <span className="font-mono bg-white px-1 rounded border text-xs">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
