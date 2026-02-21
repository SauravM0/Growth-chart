import React from 'react';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-black focus:ring-2 focus:ring-emerald-700/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
