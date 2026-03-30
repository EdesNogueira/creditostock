'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import {
  LayoutDashboard, Building2, Package, Database, FileSpreadsheet,
  FileText, GitMerge, AlertCircle, Calculator,
  FolderOpen, History, LogOut, Scale, Users,
  ArrowRightLeft, BookOpen, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/empresas',      icon: Building2,       label: 'Empresas & Filiais' },
    ],
  },
  {
    title: 'CADASTROS E BASE',
    items: [
      { href: '/catalogo',      icon: Package,         label: 'Catálogo' },
      { href: '/estoque-atual', icon: Database,        label: 'Estoque Atual' },
      { href: '/estoque',       icon: FileSpreadsheet, label: 'Importar Estoque' },
      { href: '/nfe-xml',       icon: FileText,        label: 'Importar NF-e' },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { href: '/conciliacao',   icon: GitMerge,        label: 'Vinculação' },
      { href: '/pendencias',    icon: AlertCircle,     label: 'Pendências' },
    ],
  },
  {
    title: 'FISCAL',
    items: [
      { href: '/calculos',      icon: Calculator,      label: 'Créditos ICMS' },
      { href: '/dossies',       icon: FolderOpen,      label: 'Dossiês' },
      { href: '/regras-fiscais', icon: Scale,           label: 'Regras Fiscais' },
    ],
  },
  {
    title: 'TRANSIÇÃO ST',
    items: [
      { href: '/transicao-st/regras',   icon: ArrowRightLeft, label: 'Regras ST' },
      { href: '/transicao-st/calculos', icon: Calculator,     label: 'Cálculo ST' },
      { href: '/transicao-st/ledger',   icon: BookOpen,       label: 'Extrato ST' },
    ],
  },
  {
    title: 'ADMINISTRAÇÃO',
    items: [
      { href: '/auditoria',      icon: History,  label: 'Auditoria' },
      { href: '/configuracoes',  icon: Settings, label: 'Configurações' },
      { href: '/usuarios',       icon: Users,    label: 'Usuários' },
    ],
  },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('lastro_token');
    localStorage.removeItem('creditostock_token');
    window.location.href = '/login';
  };

  return (
    <aside className={cn(
      'flex flex-col bg-[#0c1425] text-white h-full',
      mobile ? 'w-72' : 'w-60',
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center group flex-1 min-w-0">
          <Image src="/lastro-logo.png" alt="Lastro" width={120} height={32} className="object-contain object-left opacity-90 group-hover:opacity-100 transition-opacity" priority />
        </Link>
        {mobile && onClose && (
          <button onClick={onClose} className="ml-2 flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-4' : ''}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                // Match by exact path or child route segment (not prefix)
                const active = pathname === item.href || (
                  item.href !== '/dashboard' &&
                  (pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?'))
                );
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={mobile ? onClose : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
                      active
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 border-t border-white/[0.06] pt-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
