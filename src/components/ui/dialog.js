import React from 'react';
import { cn } from '../../lib/utils';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onOpenChange?.(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {children}
    </div>
  );
}

export function DialogContent({ className = '', children }) {
  return <div className={cn('w-full max-w-lg rounded-lg border border-zinc-300 bg-white p-5 shadow-xl', className)}>{children}</div>;
}

export function DialogHeader({ className = '', children }) {
  return <div className={cn('mb-3', className)}>{children}</div>;
}

export function DialogTitle({ className = '', children }) {
  return <h3 className={cn('text-lg font-semibold text-zinc-900', className)}>{children}</h3>;
}

export function DialogDescription({ className = '', children }) {
  return <p className={cn('mt-1 text-sm text-zinc-700', className)}>{children}</p>;
}

export function DialogFooter({ className = '', children }) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)}>{children}</div>;
}
