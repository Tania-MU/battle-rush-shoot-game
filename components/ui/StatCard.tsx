'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accentColor?: 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';
  icon?: React.ReactNode;
}

const ACCENT_MAP: Record<NonNullable<StatCardProps['accentColor']>, string> = {
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  sky: 'text-sky-400',
  slate: 'text-slate-100',
};

export function StatCard({
  label,
  value,
  sublabel,
  accentColor = 'slate',
  icon,
}: StatCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-medium">
        <span className="truncate">{label}</span>
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      </div>
      <div
        className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${ACCENT_MAP[accentColor]}`}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-slate-400 truncate">
          {sublabel}
        </div>
      )}
    </div>
  );
}
