import React from 'react';

export default function Skeleton({ className = '', height = 6 }: { className?: string; height?: number }){
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} style={{ height: `${height}rem` }} />
  );
}
