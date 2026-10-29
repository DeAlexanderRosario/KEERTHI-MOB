import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { authService } from '../../services/authService';
import { ErrorBanner } from '../common/ErrorBanner';
import { TableSkeleton } from '../common/LoadingSkeleton';
import type { ReportResult } from '../../services/types';

const POPULAR_REPORTS = [
  { name: 'General Ledger', category: 'Accounts', desc: 'Detailed debit and credit ledger transactions' },
  { name: 'Trial Balance', category: 'Accounts', desc: 'Debit and credit balances per account head' },
  { name: 'Profit and Loss Statement', category: 'Accounts', desc: 'Income vs operational expenses statement' },
  { name: 'Balance Sheet', category: 'Accounts', desc: 'Assets, liabilities, and equity overview' },
  { name: 'Accounts Receivable', category: 'Accounts', desc: 'Outstanding balances owed by customers' },
  { name: 'Accounts Payable', category: 'Accounts', desc: 'Outstanding amounts owed to suppliers' },
  { name: 'Stock Balance', category: 'Stock', desc: 'Current quantity and valuation in warehouses' },
  { name: 'Stock Ledger', category: 'Stock', desc: 'Audit log of all stock inbound and outbound vouchers' },
  { name: 'Ordered Items To Be Delivered', category: 'Sales', desc: 'Pending deliveries against approved sales orders' },
  { name: 'Purchase Order Trends', category: 'Purchases', desc: 'Procurement trends across supplier categories' },
];

export function ReportsHubModule() {
  const user = authService.getUser();
  const [selectedReport, setSelectedReport] = useState<string>('General Ledger');
  const [customReportName, setCustomReportName] = useState<string>('');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Filter values
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleRun = async (reportName: string = selectedReport) => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: Record<string, any> = {
        from_date: fromDate,
        to_date: toDate,
      };
      if (user?.company) filters.company = user.company;

      const res = await reportService.runReport(reportName, filters);
      setReportResult(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!reportResult || !reportResult.result.length) return;
    const cols = reportResult.columns.map((c) => c.label || c.fieldname);
    const rows = reportResult.result.map((row) =>
      reportResult.columns.map((c) => JSON.stringify(row[c.fieldname] ?? '')).join(',')
    );
    const csv = 'data:text/csv;charset=utf-8,' + [cols.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${selectedReport.toLowerCase().replace(/\s+/g, '_')}_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Official Server Reports Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Query verified ERPNext financial, stock, and sales reports. Real server calculations with date & company scoping.
          </p>
        </div>
      </div>

      {/* Report Selection & Filter Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-4">
        {/* Popular report pills */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Standard Verified Reports
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_REPORTS.map((r) => (
              <button
                key={r.name}
                onClick={() => {
                  setSelectedReport(r.name);
                  setCustomReportName('');
                  handleRun(r.name);
                }}
                className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                  selectedReport === r.name && !customReportName
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Custom Report Name */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Custom Report Name</label>
            <input
              type="text"
              value={customReportName}
              onChange={(e) => {
                setCustomReportName(e.target.value);
                if (e.target.value) setSelectedReport(e.target.value);
              }}
              placeholder="e.g. Sales Analytics..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleRun()}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Running...' : 'Execute Report'}
            </button>

            {reportResult && reportResult.result.length > 0 && (
              <button
                onClick={handleExportCsv}
                title="Download CSV"
                className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => handleRun()} />}

      {/* Summary Chips */}
      {reportResult?.report_summary && reportResult.report_summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {reportResult.report_summary.map((summary, idx) => (
            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block truncate">{summary.title}</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {summary.currency || ''} {typeof summary.value === 'number' ? summary.value.toLocaleString() : summary.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Results View */}
      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : !reportResult || reportResult.result.length === 0 ? (
        <div className="py-12 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-400">
          No records found on the server for {selectedReport}. Click &quot;Execute Report&quot; to fetch live data.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-slate-600 font-semibold">
                  {reportResult.columns.map((col, idx) => {
                    const isNum =
                      col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int';
                    return (
                      <th
                        key={idx}
                        className={`py-2.5 px-3 whitespace-nowrap ${isNum ? 'text-right' : ''}`}
                      >
                        {col.label || col.fieldname}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportResult.result.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    {reportResult.columns.map((col, cIdx) => {
                      const val = row[col.fieldname];
                      const isNum =
                        col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int';

                      let display = val !== undefined && val !== null ? String(val) : '—';
                      if (isNum && typeof val === 'number') {
                        display = val.toLocaleString(undefined, { minimumFractionDigits: 2 });
                      }

                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 whitespace-nowrap ${
                            isNum ? 'text-right font-mono tabular-nums font-medium text-slate-900' : ''
                          }`}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-mono">
            <span>{reportResult.result.length} lines returned from server</span>
            <span>Report: {selectedReport}</span>
          </div>
        </div>
      )}
    </div>
  );
}
