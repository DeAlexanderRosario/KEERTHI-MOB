import React from 'react';

interface StatusBadgeProps {
  status?: string | number | null;
  docstatus?: number;
}

export function StatusBadge({ status, docstatus }: StatusBadgeProps) {
  // Normalize docstatus if status is missing
  let label = String(status || '').trim();
  if (!label && docstatus !== undefined) {
    if (docstatus === 0) label = 'Draft';
    else if (docstatus === 1) label = 'Submitted';
    else if (docstatus === 2) label = 'Cancelled';
  }

  if (!label) return <span className="text-xs text-slate-400">—</span>;

  const lower = label.toLowerCase();

  let colorClass = 'text-slate-600 bg-slate-100';
  if (['submitted', 'paid', 'active', 'completed', 'delivered', 'present'].includes(lower)) {
    colorClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200/60';
  } else if (['draft', 'pending', 'unpaid', 'half day'].includes(lower)) {
    colorClass = 'text-amber-700 bg-amber-50 border border-amber-200/60';
  } else if (['cancelled', 'overdue', 'cancelled', 'rejected', 'absent', 'failed'].includes(lower)) {
    colorClass = 'text-rose-700 bg-rose-50 border border-rose-200/60';
  } else if (['in transit', 'dispatched', 'partially paid'].includes(lower)) {
    colorClass = 'text-blue-700 bg-blue-50 border border-blue-200/60';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${colorClass}`}>
      {label}
    </span>
  );
}
