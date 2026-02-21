import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'border-zinc-300 bg-white text-zinc-700',
  success: 'border-emerald-700 bg-emerald-50 text-emerald-800',
  warning: 'border-red-700 bg-red-50 text-red-800',
};

export function Badge({ className = '', variant = 'default', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
