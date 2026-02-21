import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-black focus:ring-2 focus:ring-emerald-700/20',
        className
      )}
      {...props}
    />
  );
});
