import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

export function Tabs({ defaultValue, value, onValueChange, children }) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = typeof value === 'string';
  const activeValue = isControlled ? value : internalValue;

  const api = useMemo(
    () => ({
      activeValue,
      setActiveValue: (next) => {
        if (!isControlled) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
    }),
    [activeValue, isControlled, onValueChange]
  );

  return <div data-tabs-root="true">{typeof children === 'function' ? children(api) : children}</div>;
}

export function TabsList({ className = '', children }) {
  return <div className={cn('mb-4 flex flex-wrap gap-2 border-b border-zinc-100 pb-3', className)}>{children}</div>;
}

export function TabsTrigger({ className = '', active, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md border px-3 py-2 text-sm transition',
        active ? 'border-black bg-black text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className = '', children }) {
  return <div className={cn(className)}>{children}</div>;
}
