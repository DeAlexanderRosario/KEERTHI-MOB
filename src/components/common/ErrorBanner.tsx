import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ErpError } from '../../services/errors';

interface ErrorBannerProps {
  error: Error | ErpError | string | null;
  onRetry?: () => void;
  title?: string;
}

export function ErrorBanner({ error, onRetry, title = 'ERPNext Communication Error' }: ErrorBannerProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;
  const erpError = error instanceof ErpError ? error : null;

  return (
    <div className="p-4 border border-rose-200 bg-rose-50/70 rounded-lg text-rose-900 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-rose-700">{title}</h5>
            {erpError?.statusCode && (
              <span className="text-[11px] font-mono text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
                HTTP {erpError.statusCode}
              </span>
            )}
            {erpError?.code && erpError.code !== 'UNKNOWN' && (
              <span className="text-[11px] font-mono text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
                {erpError.code}
              </span>
            )}
          </div>
          <p className="text-xs text-rose-800 mt-1 leading-relaxed break-words">{message}</p>
          {erpError?.traceId && (
            <p className="text-[11px] font-mono text-rose-500 mt-1">Trace ID: {erpError.traceId}</p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded transition-colors shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
