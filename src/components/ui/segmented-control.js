import React from 'react';
import { cn } from '../../lib/utils';

export function SegmentedControl({
  value,
  onValueChange,
  options = [],
  disabled = false,
  className = '',
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-zinc-300 bg-zinc-100 p-1',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onValueChange?.(option.value)}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1',
              isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-700 hover:bg-zinc-200'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
