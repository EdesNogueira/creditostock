'use client';
import Image from 'next/image';
import { Menu, Bell } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-slate-900 px-4">
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Image src="/lastro-logo.png" alt="Lastro" width={32} height={32} className="rounded-lg" />
      <button className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
      </button>
    </header>
  );
}
