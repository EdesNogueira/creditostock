'use client';
import { useEffect, useState } from 'react';
import {
  Package, GitMerge, DollarSign, CheckCircle,
  XCircle, AlertCircle, FileText, TrendingUp,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const mockCreditChart = [
  { month: 'Jul', potential: 180000, approved: 130000 },
  { month: 'Ago', potential: 195000, approved: 145000 },
  { month: 'Set', potential: 210000, approved: 158000 },
  { month: 'Out', potential: 205000, approved: 155000 },
  { month: 'Nov', potential: 222000, approved: 172000 },
  { month: 'Dez', potential: 230000, approved: 185000 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch(() =>
        setStats({
          totalStockSkus: 200,
          reconciledPct: 75,
          potentialCredit: 230000,
          approvedCredit: 185000,
          blockedCredit: 45000,
          pendingItems: 30,
          importedXmlCount: 100,
          confirmedMatches: 150,
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const creditPieData = stats
    ? [
        { name: 'Aprovado', value: stats.approvedCredit },
        { name: 'Bloqueado', value: stats.blockedCredit },
        { name: 'Não conciliado', value: stats.potentialCredit - stats.approvedCredit - stats.blockedCredit },
      ]
    : [];

  return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral da rastreabilidade fiscal" />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de SKUs em Estoque"
            value={stats ? formatNumber(stats.totalStockSkus) : '—'}
            subtitle="itens no snapshot ativo"
            icon={Package}
            variant="default"
          />
          <StatsCard
            title="% Conciliado"
            value={stats ? formatPercent(stats.reconciledPct) : '—'}
            subtitle={`${stats?.confirmedMatches ?? 0} itens vinculados a NF-e`}
            icon={GitMerge}
            variant="info"
          />
          <StatsCard
            title="Crédito Potencial"
            value={stats ? formatCurrency(stats.potentialCredit) : '—'}
            subtitle="base de cálculo ICMS"
            icon={TrendingUp}
            variant="warning"
          />
          <StatsCard
            title="Crédito Aprovado"
            value={stats ? formatCurrency(stats.approvedCredit) : '—'}
            subtitle="com documentação comprobatória"
            icon={CheckCircle}
            variant="success"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Crédito Bloqueado"
            value={stats ? formatCurrency(stats.blockedCredit) : '—'}
            subtitle="aguardando documentação"
            icon={XCircle}
            variant="danger"
          />
          <StatsCard
            title="Pendências Abertas"
            value={stats ? formatNumber(stats.pendingItems) : '—'}
            subtitle="itens sem vínculo com NF-e"
            icon={AlertCircle}
            variant="warning"
          />
          <StatsCard
            title="XML NF-e Importados"
            value={stats ? formatNumber(stats.importedXmlCount) : '—'}
            subtitle="documentos processados"
            icon={FileText}
            variant="default"
          />
        </div>

        {/* Reconciliation Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso de Conciliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Itens conciliados</span>
                  <span className="font-semibold">{stats ? formatPercent(stats.reconciledPct) : '—'}</span>
                </div>
                <Progress value={stats?.reconciledPct ?? 0} className="h-3" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats ? formatNumber(stats.confirmedMatches) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Conciliados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats ? formatNumber(stats.totalStockSkus - stats.confirmedMatches) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Pendentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">
                    {stats ? formatNumber(stats.totalStockSkus) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução de Créditos (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={mockCreditChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="potential" name="Potencial" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Aprovado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição dos Créditos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={creditPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {creditPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Importar Estoque', href: '/stock', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Importar NF-e', href: '/nfe', color: 'bg-green-50 border-green-200 text-green-700' },
                { label: 'Executar Conciliação', href: '/reconciliation', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                { label: 'Gerar Dossiê', href: '/dossiers', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-center text-center text-sm font-medium rounded-lg border p-4 hover:opacity-80 transition-opacity cursor-pointer ${item.color}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
