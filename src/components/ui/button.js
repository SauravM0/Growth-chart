import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'border border-black bg-black text-white hover:bg-zinc-900',
  secondary: 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100',
  destructive: 'border border-red-700 bg-red-700 text-white hover:bg-red-800',
  ghost: 'border border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({ className = '', variant = 'default', size = 'md', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}
