'use client';

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  return (
    <span className={`relative group inline-flex cursor-help ${className}`}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-slate-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-normal min-w-[200px] max-w-[280px] text-center leading-relaxed">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
}
