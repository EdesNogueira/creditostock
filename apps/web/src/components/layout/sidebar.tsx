'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Package, FileSpreadsheet,
  FileText, GitMerge, AlertCircle, Calculator,
  FolderOpen, History, LogOut, ChevronRight,
  Scale, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/companies', icon: Building2, label: 'Empresas & Filiais' },
  { href: '/products', icon: Package, label: 'Catálogo de Produtos' },
  { href: '/stock', icon: FileSpreadsheet, label: 'Importar Estoque' },
  { href: '/nfe', icon: FileText, label: 'Importar NF-e XML' },
  { href: '/reconciliation', icon: GitMerge, label: 'Conciliação' },
  { href: '/issues', icon: AlertCircle, label: 'Pendências' },
  { href: '/calculations', icon: Calculator, label: 'Cálculo de Créditos' },
  { href: '/dossiers', icon: FolderOpen, label: 'Dossiês' },
  { href: '/tax-rules', icon: Scale, label: 'Regras Fiscais' },
  { href: '/audit', icon: History, label: 'Auditoria' },
  { href: '/users', icon: Users, label: 'Usuários' },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('creditostock_token');
    window.location.href = '/login';
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">CreditoStock</p>
          <p className="text-xs text-slate-400">Rastreabilidade Fiscal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3 w-3 opacity-70" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
