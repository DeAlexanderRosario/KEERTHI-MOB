import React, { useState } from 'react';
import {
  Calculator,
  FileText,
  DollarSign,
  BookOpen,
  PieChart,
  Table,
  Calendar,
  Download,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';
import { reportService } from '../../services/reportService';
import { authService } from '../../services/authService';
import { ErrorBanner } from '../common/ErrorBanner';
import { TableSkeleton } from '../common/LoadingSkeleton';
import type { ReportResult } from '../../services/types';

interface AccountsModuleProps {
  initialSubTab?: string;
  initialDocName?: string;
}

export function AccountsModule({
  initialSubTab = 'sales_invoices',
  initialDocName,
}: AccountsModuleProps) {
  const user = authService.getUser();
  const [activeTab, setActiveTab] = useState<string>(initialSubTab);

  // Form drilldown state
  const [editingDocType, setEditingDocType] = useState<string | null>(
    initialDocName ? 'Sales Invoice' : null
  );
  const [editingDocName, setEditingDocName] = useState<string | undefined>(initialDocName);

  // Report state
  const [selectedReport, setSelectedReport] = useState<string>('General Ledger');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<Error | null>(null);

  // Report filters
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleOpenDoc = (doctype: string, name?: string) => {
    setEditingDocType(doctype);
    setEditingDocName(name);
  };

  const handleCloseDoc = () => {
    setEditingDocType(null);
    setEditingDocName(undefined);
  };

  const handleRunReport = async (reportName: string = selectedReport) => {
    setIsReportLoading(true);
    setReportError(null);

    try {
      const filters: Record<string, any> = {
        from_date: fromDate,
        to_date: toDate,
      };
      if (user?.company) filters.company = user.company;

      const res = await reportService.runReport(reportName, filters);
      setReportResult(res);
    } catch (err: any) {
      setReportError(err);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!reportResult || !reportResult.result.length) return;
    const cols = reportResult.columns.map((c) => c.label || c.fieldname);
    const rows = reportResult.result.map((row) =>
      reportResult.columns.map((c) => JSON.stringify(row[c.fieldname] ?? '')).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [cols.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReport.toLowerCase().replace(/\s+/g, '_')}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If viewing/editing a document form
  if (editingDocType) {
    return (
      <DocTypeForm
        doctype={editingDocType}
        docName={editingDocName}
        onBack={handleCloseDoc}
        onSaved={() => {}}
      />
    );
  }

  const tabs = [
    { id: 'sales_invoices', label: 'Sales Invoices', doctype: 'Sales Invoice' },
    { id: 'purchase_invoices', label: 'Purchase Invoices', doctype: 'Purchase Invoice' },
    { id: 'payment_entry', label: 'Payment Entries', doctype: 'Payment Entry' },
    { id: 'journal_entry', label: 'Journal Entries', doctype: 'Journal Entry' },
    { id: 'chart_of_accounts', label: 'Chart of Accounts', doctype: 'Account' },
    { id: 'financial_reports', label: 'Financial Reports (Server)', isReport: true },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.isReport && !reportResult && !isReportLoading) {
                handleRunReport();
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render Document List or Report */}
      {activeTab === 'sales_invoices' && (
        <DocTypeList
          doctype="Sales Invoice"
          onSelectDoc={(name) => handleOpenDoc('Sales Invoice', name)}
          onNewDoc={() => handleOpenDoc('Sales Invoice')}
        />
      )}

      {activeTab === 'purchase_invoices' && (
        <DocTypeList
          doctype="Purchase Invoice"
          onSelectDoc={(name) => handleOpenDoc('Purchase Invoice', name)}
          onNewDoc={() => handleOpenDoc('Purchase Invoice')}
        />
      )}

      {activeTab === 'payment_entry' && (
        <DocTypeList
          doctype="Payment Entry"
          onSelectDoc={(name) => handleOpenDoc('Payment Entry', name)}
          onNewDoc={() => handleOpenDoc('Payment Entry')}
        />
      )}

      {activeTab === 'journal_entry' && (
        <DocTypeList
          doctype="Journal Entry"
          onSelectDoc={(name) => handleOpenDoc('Journal Entry', name)}
          onNewDoc={() => handleOpenDoc('Journal Entry')}
        />
      )}

      {activeTab === 'chart_of_accounts' && (
        <DocTypeList
          doctype="Account"
          onSelectDoc={(name) => handleOpenDoc('Account', name)}
          onNewDoc={() => handleOpenDoc('Account')}
        />
      )}

      {activeTab === 'financial_reports' && (
        <div className="space-y-4">
          {/* Report Toolbar */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">ERPNext Financial Statement Engine</h3>
                <p className="text-xs text-slate-500">Official server-side report calculation and posting audit</p>
              </div>

              <div className="flex items-center gap-2">
                {reportResult && reportResult.result.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
                <button
                  onClick={() => handleRunReport()}
                  disabled={isReportLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReportLoading ? 'animate-spin' : ''}`} />
                  {isReportLoading ? 'Generating...' : 'Run Report'}
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Report Statement</label>
                <select
                  value={selectedReport}
                  onChange={(e) => {
                    setSelectedReport(e.target.value);
                    handleRunReport(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="General Ledger">General Ledger</option>
                  <option value="Trial Balance">Trial Balance</option>
                  <option value="Profit and Loss Statement">Profit and Loss Statement</option>
                  <option value="Balance Sheet">Balance Sheet</option>
                  <option value="Accounts Receivable">Accounts Receivable</option>
                  <option value="Accounts Payable">Accounts Payable</option>
                </select>
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Scope</label>
                <input
                  type="text"
                  readOnly
                  value={user?.company || 'Keerthi Groups'}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50 text-slate-600 rounded-md"
                />
              </div>
            </div>
          </div>

          {reportError && <ErrorBanner error={reportError} onRetry={() => handleRunReport()} />}

          {/* Report Summary Cards (if server returns report_summary) */}
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

          {/* Report Results Table */}
          {isReportLoading ? (
            <TableSkeleton rows={12} cols={6} />
          ) : !reportResult || reportResult.result.length === 0 ? (
            <div className="py-12 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-400">
              No ledger rows or accounting entries returned for the selected date range.
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
                <span>{reportResult.result.length} lines calculated by ERPNext server</span>
                <span>Authoritative Ledger</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
