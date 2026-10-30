import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  LayoutGrid,
  List as ListIcon,
  ChevronRight as ChevronRightIcon,
  Package,
} from 'lucide-react';
import { metadataService } from '../../services/metadataService';
import { documentService } from '../../services/documentService';
import { permissionService } from '../../services/permissionService';
import { TableSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { ErrorBanner } from '../common/ErrorBanner';
import { StatusBadge } from '../common/StatusBadge';
import type { DocTypeMeta, DocField, ERPDocument } from '../../services/types';

interface DocTypeListProps {
  doctype: string;
  customTitle?: string;
  onSelectDoc?: (name: string) => void;
  onNewDoc?: () => void;
  baseFilters?: any[];
}

export function DocTypeList({
  doctype,
  customTitle,
  onSelectDoc,
  onNewDoc,
  baseFilters = [],
}: DocTypeListProps) {
  const [meta, setMeta] = useState<DocTypeMeta | null>(null);
  const [columns, setColumns] = useState<DocField[]>([]);
  const [documents, setDocuments] = useState<ERPDocument[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Distinguish initial loading from background refresh to avoid table flickering
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Search & filter state with debouncing
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;
  const [sortField, setSortField] = useState<string>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'cards';
    }
    return 'table';
  });

  const activeRequestIdRef = useRef<number>(0);
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Debounce search text by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Stabilize baseFilters to prevent reference loops
  const serializedBaseFilters = useMemo(() => {
    try {
      return JSON.stringify(baseFilters || []);
    } catch {
      return '[]';
    }
  }, [baseFilters]);

  // Load DocType Metadata - reset all states immediately when doctype prop switches
  useEffect(() => {
    let active = true;

    // Reset old metadata and documents to prevent mismatched queries
    setMeta(null);
    setColumns([]);
    setError(null);
    setDocuments([]);
    setIsInitialLoading(true);
    hasLoadedOnceRef.current = false;
    activeRequestIdRef.current++;

    metadataService
      .getDocTypeMeta(doctype)
      .then((m) => {
        if (!active) return;
        setMeta(m);
        const listCols = metadataService.getListViewFields(m);
        setColumns(listCols);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setIsInitialLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctype]);

  // Load Documents with cancellation and background refresh protection
  const loadDocuments = useCallback(
    async (isBackground = false) => {
      // Guard: Never execute document queries if metadata is absent or belongs to a different DocType!
      if (!meta || meta.name !== doctype) {
        return;
      }

      const requestId = ++activeRequestIdRef.current;

      if (!hasLoadedOnceRef.current && !isBackground) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        let parsedBaseFilters: any[] = [];
        try {
          parsedBaseFilters = JSON.parse(serializedBaseFilters);
        } catch {
          parsedBaseFilters = [];
        }

        const filters: any[] = [...parsedBaseFilters];
        const validMetaFieldnames = new Set((meta.fields || []).map((f) => f.fieldname));

        if (debouncedSearchText.trim()) {
          let searchField = 'name';
          if (meta.title_field && validMetaFieldnames.has(meta.title_field)) {
            searchField = meta.title_field;
          } else if (validMetaFieldnames.has('item_name')) {
            searchField = 'item_name';
          } else if (validMetaFieldnames.has('customer_name')) {
            searchField = 'customer_name';
          } else if (validMetaFieldnames.has('title')) {
            searchField = 'title';
          }
          filters.push([searchField, 'like', `%${debouncedSearchText.trim()}%`]);
        }

        // Only request system fields + fields that exist in this DocType's schema
        const fieldsToFetch: string[] = ['name', 'docstatus', 'modified', 'modified_by'];

        if (meta.title_field && validMetaFieldnames.has(meta.title_field)) {
          if (!fieldsToFetch.includes(meta.title_field)) {
            fieldsToFetch.push(meta.title_field);
          }
        }

        // Add candidate title/status fields ONLY if present in meta.fields
        const candidateFields = [
          'item_name',
          'item_code',
          'customer_name',
          'supplier_name',
          'employee_name',
          'title',
          'status',
        ];

        for (const cf of candidateFields) {
          if (validMetaFieldnames.has(cf) && !fieldsToFetch.includes(cf)) {
            fieldsToFetch.push(cf);
          }
        }

        for (const col of columns) {
          if (validMetaFieldnames.has(col.fieldname) && !fieldsToFetch.includes(col.fieldname)) {
            fieldsToFetch.push(col.fieldname);
          }
        }

        const limitStart = (page - 1) * pageSize;
        const [listResult, countResult] = await Promise.all([
          documentService.list(doctype, {
            fields: fieldsToFetch,
            filters,
            order_by: `${sortField} ${sortOrder}`,
            limit_start: limitStart,
            limit_page_length: pageSize,
          }),
          documentService.count(doctype, filters),
        ]);

        if (requestId !== activeRequestIdRef.current) {
          return;
        }

        setDocuments(listResult);
        setTotalCount(countResult);
        hasLoadedOnceRef.current = true;
      } catch (err: any) {
        if (requestId === activeRequestIdRef.current) {
          setError(err);
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [doctype, meta, columns, serializedBaseFilters, debouncedSearchText, page, sortField, sortOrder]
  );

  // Trigger load ONLY when meta exists and matches current doctype
  useEffect(() => {
    if (meta && meta.name === doctype) {
      loadDocuments(hasLoadedOnceRef.current);
    }
  }, [meta, doctype, loadDocuments]);

  const handleSort = (fieldname: string) => {
    if (sortField === fieldname) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldname);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getPrimaryDocTitle = (doc: ERPDocument) => {
    return (
      doc.item_name ||
      doc.customer_name ||
      doc.supplier_name ||
      doc.employee_name ||
      doc.title ||
      (meta?.title_field && doc[meta.title_field]) ||
      doc.name
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const canCreate = permissionService.canCreate(meta);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{customTitle || doctype}</span>
            {isRefreshing && (
              <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" title="Updating records..." />
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>ERPNext v16</span>
            <span>·</span>
            <span className="font-mono tabular-nums text-slate-600">{totalCount} records</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center bg-white p-1 rounded-full border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-full ${
                viewMode === 'table' ? 'bg-[#0f1115] text-white shadow-xs' : 'text-slate-400'
              }`}
              title="Table view"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-full ${
                viewMode === 'cards' ? 'bg-[#0f1115] text-white shadow-xs' : 'text-slate-400'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => loadDocuments(true)}
            disabled={isRefreshing || isInitialLoading || !meta}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-lime-600' : ''}`} />
          </button>

          {canCreate && onNewDoc && (
            <button
              onClick={onNewDoc}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black active:scale-95 rounded-full shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-lime-400" />
              <span>New {meta?.name || doctype}</span>
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => loadDocuments(true)} />}

      {/* Filter / Search Bar */}
      <div className="bg-white p-2.5 sm:p-3 border border-slate-100 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${doctype} by name, code, or title...`}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#f8f9fa] border border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
          />
        </div>
        {searchText && (
          <button
            onClick={() => {
              setSearchText('');
              setPage(1);
            }}
            className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table Content & Anti-Flicker View */}
      {isInitialLoading && documents.length === 0 ? (
        <TableSkeleton rows={pageSize} cols={columns.length + 1} />
      ) : documents.length === 0 ? (
        <EmptyState
          title={`No ${doctype} records found`}
          description={
            debouncedSearchText
              ? `No records match search "${debouncedSearchText}".`
              : `There are currently no ${doctype} documents saved on the live ERPNext server.`
          }
          actionLabel={canCreate && onNewDoc ? `Create First ${doctype}` : undefined}
          onAction={canCreate && onNewDoc ? onNewDoc : undefined}
        />
      ) : (
        <div className="border border-slate-100 rounded-[32px] bg-white overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative">
          {/* Subtle top indicator during background refresh */}
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-lime-500 to-transparent animate-pulse z-20" />
          )}

          {/* Mobile Card View */}
          {viewMode === 'cards' && (
            <div className="sm:hidden divide-y divide-slate-100">
              {documents.map((doc) => {
                const primaryTitle = getPrimaryDocTitle(doc);
                return (
                  <div
                    key={doc.name}
                    onClick={() => onSelectDoc?.(doc.name)}
                    className="p-5 hover:bg-slate-50/70 active:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">
                          {primaryTitle}
                        </span>
                        {primaryTitle !== doc.name && (
                          <span className="font-mono text-[11px] text-slate-400">
                            ID: {doc.name}
                          </span>
                        )}
                      </div>
                      {Boolean(meta?.is_submittable) ? (
                        <StatusBadge docstatus={doc.docstatus} status={doc.status} />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3">
                      {columns.slice(0, 4).map((col) => {
                        const val = doc[col.fieldname];
                        const isNumeric =
                          col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int';
                        const displayVal =
                          val !== undefined && val !== null
                            ? isNumeric && typeof val === 'number'
                              ? val.toLocaleString()
                              : String(val)
                            : '—';

                        return (
                          <div key={col.fieldname} className="truncate">
                            <span className="text-[10px] text-slate-400 block uppercase font-medium">
                              {col.label || col.fieldname}
                            </span>
                            <span className={`font-medium ${isNumeric ? 'font-mono' : ''}`}>
                              {displayVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
                      <span className="font-mono">
                        {doc.modified ? doc.modified.slice(0, 10) : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-800 font-semibold text-xs">
                        Inspect
                        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Classic Modern Minimalist Table */}
          <div className={`overflow-x-auto ${viewMode === 'cards' ? 'hidden sm:block' : 'block'}`}>
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-[#f8f9fa]/80 text-slate-500 font-medium select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 whitespace-nowrap sticky left-0 bg-[#f8f9fa] z-10"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{doctype === 'Item' ? 'Item / ID' : doctype === 'Customer' ? 'Customer / ID' : 'Document'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.fieldname}
                      onClick={() => handleSort(col.fieldname)}
                      className={`py-3.5 px-3.5 cursor-pointer hover:text-slate-900 whitespace-nowrap ${
                        col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int'
                          ? 'text-right'
                          : ''
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 ${
                          col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int'
                            ? 'justify-end'
                            : ''
                        }`}
                      >
                        <span>{col.label || col.fieldname}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  ))}
                  {Boolean(meta?.is_submittable) ? (
                    <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Status</th>
                  ) : null}
                  <th
                    onClick={() => handleSort('modified')}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 text-right whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Modified</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const primaryTitle = getPrimaryDocTitle(doc);
                  const hasSeparateId = primaryTitle !== doc.name;

                  return (
                    <tr
                      key={doc.name}
                      onClick={() => onSelectDoc?.(doc.name)}
                      className="hover:bg-slate-50/70 active:bg-slate-100 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900 text-xs whitespace-nowrap group-hover:text-black sticky left-0 bg-white group-hover:bg-slate-50/90 transition-colors z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200/80 flex items-center justify-center text-slate-600 group-hover:text-black shrink-0 transition-colors">
                            {doctype === 'Item' ? (
                              <Package className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-slate-900 text-xs group-hover:text-black leading-tight">
                              {primaryTitle}
                            </span>
                            {hasSeparateId && (
                              <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                                ID: {doc.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {columns.map((col) => {
                        const val = doc[col.fieldname];
                        const isNumeric =
                          col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int';

                        let formattedVal = val !== undefined && val !== null ? String(val) : '—';
                        if (isNumeric && typeof val === 'number') {
                          formattedVal = val.toLocaleString();
                        }

                        return (
                          <td
                            key={col.fieldname}
                            className={`py-3.5 px-3.5 whitespace-nowrap ${
                              isNumeric ? 'text-right font-mono tabular-nums' : ''
                            }`}
                          >
                            {col.fieldname === 'status' ? (
                              <StatusBadge status={val} docstatus={doc.docstatus} />
                            ) : (
                              <span className="truncate max-w-[220px] inline-block">{formattedVal}</span>
                            )}
                          </td>
                        );
                      })}

                      {Boolean(meta?.is_submittable) ? (
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                          <StatusBadge docstatus={doc.docstatus} status={doc.status} />
                        </td>
                      ) : null}

                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                        {doc.modified ? doc.modified.slice(0, 16) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-[#f8f9fa]/70 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(page * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{totalCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isRefreshing}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200/80 rounded-full bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 font-mono text-slate-700 text-xs">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isRefreshing}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200/80 rounded-full bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
