import React from 'react';

export function Tooltip({ text = '', children }) {
  if (!text) {
    return children;
  }

  return (
    <span title={text} aria-label={text}>
      {children}
    </span>
  );
}
