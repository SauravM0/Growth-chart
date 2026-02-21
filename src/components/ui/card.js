import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className = '', children, ...props }) {
  return (
    <section className={cn('rounded-xl border border-zinc-200 bg-white shadow-sm', className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <header className={cn('border-b border-zinc-100 px-4 py-3', className)} {...props}>
      {children}
    </header>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={cn('text-sm font-semibold text-zinc-900', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={cn('mt-1 text-xs text-zinc-600', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={cn('px-4 py-3', className)} {...props}>
      {children}
    </div>
  );
}
