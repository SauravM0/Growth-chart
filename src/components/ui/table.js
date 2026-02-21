import React from 'react';
import { cn } from '../../lib/utils';

export function Table({ className = '', ...props }) {
  return <table className={cn('min-w-full divide-y divide-zinc-200', className)} {...props} />;
}

export function TableHeader({ className = '', ...props }) {
  return <thead className={cn('sticky top-0 bg-zinc-100/95 backdrop-blur', className)} {...props} />;
}

export function TableBody({ className = '', ...props }) {
  return <tbody className={cn('divide-y divide-zinc-200 bg-white', className)} {...props} />;
}

export function TableRow({ className = '', ...props }) {
  return <tr className={cn(className)} {...props} />;
}

export function TableHead({ className = '', ...props }) {
  return (
    <th
      className={cn('px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700', className)}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }) {
  return <td className={cn('px-4 py-2.5 text-sm text-zinc-900', className)} {...props} />;
}
