'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200/80 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-help"
        aria-label="Mais informações"
      >
        <Info className="w-2.5 h-2.5" />
      </button>
      {open && (
        <span
          className="absolute z-[100] left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-64 rounded-xl bg-slate-900 text-white text-xs px-3 py-2.5 shadow-2xl leading-relaxed pointer-events-none"
          role="tooltip"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
        </span>
      )}
    </span>
  );
}
