'use client';

import React from 'react';
import { motion } from 'motion/react';

interface SectionModalProps {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  headerRight?: React.ReactNode;
}

export function SectionModal({
  title,
  kicker,
  children,
  maxWidthClass = 'max-w-3xl',
  headerRight,
}: SectionModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full ${maxWidthClass} bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl my-auto`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 mb-6 border-b border-slate-800">
          <div>
            {kicker && (
              <p className="text-xs font-medium text-rose-400 mb-1">
                {kicker}
              </p>
            )}
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 font-[var(--font-display)]">
              {title}
            </h2>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
