'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, AlertCircle, FileText, FileSpreadsheet,
  GitMerge, Package, FolderOpen, ArrowRight, ArrowUpRight,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

interface DashboardStats {
  totalStockSkus: number;
  reconciledPct: number;
  potentialCredit: number;
  approvedCredit: number;
  blockedCredit: number;
  pendingItems: number;
  importedXmlCount: number;
  confirmedMatches: number;
}

const AREA_DATA = [
  { month: 'Jul', potential: 180000, approved: 130000 },
  { month: 'Ago', potential: 195000, approved: 145000 },
  { month: 'Set', potential: 210000, approved: 158000 },
  { month: 'Out', potential: 205000, approved: 155000 },
  { month: 'Nov', potential: 222000, approved: 172000 },
  { month: 'Dez', potential: 230000, approved: 185000 },
];

const PIE_COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

function StatCard({ title, value, sub, icon: Icon, trend, color = 'blue', href }: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
  color?: string;
  href?: string;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-100 text-slate-600',
  }[color] ?? 'bg-blue-50 text-blue-600';

  const inner = (
    <div className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colors}`}>
          <Icon className="h-5 w-5" />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs text-green-600 font-medium">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch(() => setStats({
        totalStockSkus: 200, reconciledPct: 75, potentialCredit: 230000,
        approvedCredit: 185000, blockedCredit: 45000, pendingItems: 30,
        importedXmlCount: 100, confirmedMatches: 150,
      }))
      .finally(() => setLoading(false));
  }, []);

  const pieData = stats ? [
    { name: 'Aprovado', value: stats.approvedCredit },
    { name: 'Bloqueado', value: stats.blockedCredit },
    { name: 'Pendente', value: Math.max(0, stats.potentialCredit - stats.approvedCredit - stats.blockedCredit) },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Page header */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur px-4 lg:px-6">
        <h1 className="text-base font-semibold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
            AD
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 lg:p-8 shadow-xl shadow-blue-900/20">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-indigo-400/10 blur-2xl" />

          <div className="relative">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-0 lg:justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium mb-1">Crédito de ICMS Identificado</p>
                <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  {loading ? '—' : formatCurrency(stats?.potentialCredit ?? 0)}
                </p>
                <p className="text-blue-200 text-sm">
                  Base apurada sobre o estoque atual — {loading ? '—' : formatPercent(stats?.reconciledPct ?? 0)} conciliado
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-blue-200 text-xs mb-1">Crédito Aprovado</p>
                  <p className="text-xl font-bold text-white">{loading ? '—' : formatCurrency(stats?.approvedCredit ?? 0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-blue-200 text-xs mb-1">Bloqueado</p>
                  <p className="text-xl font-bold text-white">{loading ? '—' : formatCurrency(stats?.blockedCredit ?? 0)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-blue-200 text-xs mb-1">NF-es</p>
                  <p className="text-xl font-bold text-white">{loading ? '—' : formatNumber(stats?.importedXmlCount ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-xs">Progresso da conciliação</span>
                <span className="text-white text-xs font-semibold">{loading ? '—' : formatPercent(stats?.reconciledPct ?? 0)}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${stats?.reconciledPct ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            title="SKUs em Estoque"
            value={loading ? '—' : formatNumber(stats?.totalStockSkus ?? 0)}
            sub="no snapshot ativo"
            icon={Package}
            color="blue"
            href="/stock"
          />
          <StatCard
            title="Itens Conciliados"
            value={loading ? '—' : formatNumber(stats?.confirmedMatches ?? 0)}
            sub={`de ${formatNumber(stats?.totalStockSkus ?? 0)} total`}
            icon={GitMerge}
            color="green"
            href="/reconciliation"
          />
          <StatCard
            title="Pendências Abertas"
            value={loading ? '—' : formatNumber(stats?.pendingItems ?? 0)}
            sub="requerem atenção"
            icon={AlertCircle}
            color="yellow"
            href="/issues"
          />
          <StatCard
            title="NF-e Importadas"
            value={loading ? '—' : formatNumber(stats?.importedXmlCount ?? 0)}
            sub="documentos fiscais"
            icon={FileText}
            color="purple"
            href="/nfe"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area chart - takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Evolução dos Créditos</h3>
                <p className="text-xs text-slate-500 mt-0.5">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-500 inline-block"/><span>Potencial</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-emerald-500 inline-block"/><span>Aprovado</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={AREA_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPotential" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: '12px', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="potential" name="Potencial" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPotential)" />
                <Area type="monotone" dataKey="approved" name="Aprovado" stroke="#10b981" strokeWidth={2} fill="url(#gradApproved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-1">Composição</h3>
            <p className="text-xs text-slate-500 mb-4">Distribuição dos créditos</p>
            {stats ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Carregando...</div>
            )}
          </div>
        </div>

        {/* Conciliation progress + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conciliation breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Status da Conciliação</h3>
            <div className="space-y-3">
              {[
                { label: 'Conciliados com lastro completo', value: stats?.confirmedMatches ?? 0, total: stats?.totalStockSkus ?? 1, color: 'bg-emerald-500' },
                { label: 'Pendentes de revisão', value: stats?.pendingItems ?? 0, total: stats?.totalStockSkus ?? 1, color: 'bg-amber-400' },
                { label: 'Sem vínculo com NF-e', value: Math.max(0, (stats?.totalStockSkus ?? 0) - (stats?.confirmedMatches ?? 0) - (stats?.pendingItems ?? 0)), total: stats?.totalStockSkus ?? 1, color: 'bg-slate-300' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-800">{formatNumber(item.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Importar Estoque', href: '/stock', icon: FileSpreadsheet, desc: 'CSV / XLSX', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { label: 'Importar NF-e', href: '/nfe', icon: FileText, desc: 'Arquivo XML', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { label: 'Executar Matching', href: '/reconciliation', icon: GitMerge, desc: 'Auto + manual', color: 'text-violet-600 bg-violet-50 border-violet-100' },
                { label: 'Gerar Dossiê', href: '/dossiers', icon: FolderOpen, desc: 'PDF + CSV', color: 'text-orange-600 bg-orange-50 border-orange-100' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl border p-3 hover:shadow-sm transition-all ${item.color}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.label}</p>
                      <p className="text-xs opacity-70">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
