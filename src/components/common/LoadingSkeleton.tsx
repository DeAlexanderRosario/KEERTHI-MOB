import React from 'react';

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="border-b border-slate-200 bg-slate-50/75 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${100 / cols}%` }} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 bg-slate-100 rounded animate-pulse"
                style={{ width: `${80 / cols + (c % 2 ? 10 : 0)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg">
      <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-2" />
      <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}
