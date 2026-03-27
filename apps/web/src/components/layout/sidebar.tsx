'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import {
  LayoutDashboard, Building2, Package, FileSpreadsheet,
  FileText, GitMerge, AlertCircle, Calculator,
  FolderOpen, History, LogOut, Scale, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/companies', icon: Building2, label: 'Empresas & Filiais' },
  { href: '/products', icon: Package, label: 'Catálogo' },
  { href: '/stock', icon: FileSpreadsheet, label: 'Importar Estoque' },
  { href: '/nfe', icon: FileText, label: 'Importar NF-e' },
  { href: '/reconciliation', icon: GitMerge, label: 'Conciliação' },
  { href: '/issues', icon: AlertCircle, label: 'Pendências' },
  { href: '/calculations', icon: Calculator, label: 'Créditos' },
  { href: '/dossiers', icon: FolderOpen, label: 'Dossiês' },
  { href: '/tax-rules', icon: Scale, label: 'Regras Fiscais' },
  { href: '/audit', icon: History, label: 'Auditoria' },
  { href: '/users', icon: Users, label: 'Usuários' },
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
      {/* Logo section */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center group flex-1 min-w-0">
          <Image
            src="/lastro-logo.png"
            alt="Lastro"
            width={148}
            height={40}
            className="object-contain object-left opacity-90 group-hover:opacity-100 transition-opacity max-w-full"
            priority
          />
        </Link>
        {mobile && onClose && (
          <button onClick={onClose} className="ml-2 flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
