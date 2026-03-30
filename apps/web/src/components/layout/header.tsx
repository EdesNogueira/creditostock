'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, LogOut, User, KeyRound, BookOpen, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/users/me/onboarding').then(r => {
      // The onboarding endpoint returns user data indirectly; we'll get name from token
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lastro_token');
    localStorage.removeItem('creditostock_token');
    window.location.href = '/login';
  };

  const handleResetTour = () => {
    api.put('/users/me/onboarding/reset').then(() => window.location.reload()).catch(() => {});
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 backdrop-blur px-4 lg:px-6">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="hidden sm:block text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar..." className="w-52 h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus:bg-white" />
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
              AD
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Administrador</p>
                <p className="text-xs text-slate-500">admin@lastro.com.br</p>
                <p className="text-[10px] text-blue-600 font-medium mt-0.5">ADMIN</p>
              </div>
              <button onClick={handleResetTour} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <BookOpen className="h-4 w-4 text-slate-400" /> Ver tour novamente
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
