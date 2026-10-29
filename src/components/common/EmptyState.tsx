import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No documents found',
  description = 'No records match your criteria in the ERPNext database.',
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-slate-200/80 rounded-[24px] shadow-xs">
      <div className="p-3.5 bg-slate-100 rounded-2xl text-slate-500 mb-3.5">
        {icon || <FolderOpen className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0e1013] hover:bg-slate-900 active:scale-95 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-lime-400" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
