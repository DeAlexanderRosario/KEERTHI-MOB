import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Table as TableIcon } from 'lucide-react';
import { metadataService } from '../../services/metadataService';
import { attachmentService } from '../../services/attachmentService';
import { vmsService } from '../../services/vmsService';
import type { DocField, DocTypeMeta } from '../../services/types';

interface ChildTableEditorProps {
  tableDocType: string;
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
  readOnly?: boolean;
}

export function ChildTableEditor({
  tableDocType,
  rows,
  onChange,
  readOnly = false,
}: ChildTableEditorProps) {
  const [meta, setMeta] = useState<DocTypeMeta | null>(null);
  const [columns, setColumns] = useState<DocField[]>([]);
  const [linkOptions, setLinkOptions] = useState<Record<string, Array<{ value: string; description?: string }>>>({});
  const [salesOrderItems, setSalesOrderItems] = useState<Record<string, Array<Record<string, any>>>>({});
  const [salesOrderItemErrors, setSalesOrderItemErrors] = useState<Record<string, string>>({});
  const [loadingSalesOrder, setLoadingSalesOrder] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    metadataService
      .getDocTypeMeta(tableDocType)
      .then((m) => {
        if (!active) return;
        setMeta(m);
        // Exclude internal fields and layout breaks
        const cols = m.fields.filter(
          (f) =>
            f.fieldtype !== 'Section Break' &&
            f.fieldtype !== 'Column Break' &&
            f.fieldtype !== 'Tab Break' &&
            f.fieldname !== 'name' &&
            f.fieldname !== 'parent' &&
            f.fieldname !== 'parentfield' &&
            f.fieldname !== 'parenttype' &&
            f.fieldname !== 'idx' &&
            !f.hidden
        ).slice(0, 7);
        setColumns(cols);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [tableDocType]);

  const handleCellChange = (rowIndex: number, fieldname: string, value: any) => {
    const updated = rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const changed = { ...row, [fieldname]: value };
      if (fieldname === 'sales_order' && tableDocType === 'Vehicle Allocation Order') {
        return { ...changed, sales_order_item: '', item_code: '', customer: '', warehouse: '' };
      }
      return changed;
    });
    onChange(updated);
  };

  const loadSalesOrderItems = async (salesOrder: string) => {
    if (!salesOrder || salesOrderItems[salesOrder] || loadingSalesOrder === salesOrder) return;
    setLoadingSalesOrder(salesOrder);
    try {
      const order = await vmsService.getSalesOrderAllocationItems(salesOrder);
      setSalesOrderItems((current) => ({
        ...current,
        [salesOrder]: Array.isArray(order.items) ? order.items.map((item) => ({ ...item, __customer: order.customer })) : [],
      }));
      setSalesOrderItemErrors((current) => ({ ...current, [salesOrder]: '' }));
    } catch (error: any) {
      setSalesOrderItems((current) => ({ ...current, [salesOrder]: [] }));
      setSalesOrderItemErrors((current) => ({
        ...current,
        [salesOrder]: error?.message || 'Could not load items for this Sales Order.',
      }));
    } finally {
      setLoadingSalesOrder(null);
    }
  };

  const chooseSalesOrderItem = (rowIndex: number, item: Record<string, any>) => {
    const existing = rows[rowIndex];
    if (!existing) return;
    const updated = rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            sales_order_item: item.name,
            item_code: item.item_code,
            customer: item.__customer || item.customer || existing.customer,
            warehouse: item.warehouse || existing.warehouse,
            allocated_qty: item.available_qty > 0 ? item.available_qty : existing.allocated_qty,
          }
        : row
    );
    onChange(updated);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    for (const col of columns) {
      if (col.default !== undefined) {
        newRow[col.fieldname] = col.default;
      }
    }
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white my-3">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <TableIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">
            {meta?.name || tableDocType} ({rows.length} rows)
          </span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Row
          </button>
        )}
      </div>

      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-medium">
              <th className="py-2 px-2 text-center w-10">#</th>
              {columns.map((col) => (
                <th key={col.fieldname} className="py-2 px-2.5 whitespace-nowrap">
                  <span>{col.label || col.fieldname}</span>
                  {Boolean(col.reqd) && <span className="text-rose-500 ml-0.5">*</span>}
                </th>
              ))}
              {!readOnly ? <th className="py-2 px-2 w-10 text-center"></th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (readOnly ? 1 : 2)} className="py-6 text-center text-slate-400">
                  No items added yet. Click &quot;Add Row&quot; to insert an item.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2 px-2 text-center font-mono text-slate-400 text-[11px]">
                    {idx + 1}
                  </td>
                  {columns.map((col) => {
                    const val = row[col.fieldname] ?? '';
                    const isNum =
                      col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int';

                    return (
                      <td key={col.fieldname} className="py-1.5 px-2">
                        {readOnly ? (
                          <span className={`block truncate ${isNum ? 'text-right font-mono' : ''}`}>
                            {val !== '' ? String(val) : '—'}
                          </span>
                        ) : col.fieldtype === 'Check' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleCellChange(idx, col.fieldname, e.target.checked ? 1 : 0)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        ) : col.fieldtype === 'Link' && col.options === 'Sales Order Item' && tableDocType === 'Vehicle Allocation Order' ? (
                          <div className="min-w-48">
                            <select
                              value={val}
                              onFocus={() => loadSalesOrderItems(String(row.sales_order || ''))}
                              onChange={(event) => {
                                const item = salesOrderItems[String(row.sales_order || '')]?.find((entry) => entry.name === event.target.value);
                                if (item) chooseSalesOrderItem(idx, item);
                              }}
                              disabled={!row.sales_order || loadingSalesOrder === String(row.sales_order)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              <option value="">
                                {!row.sales_order ? 'Select Sales Order first' : loadingSalesOrder === String(row.sales_order) ? 'Loading order items…' : 'Select an item from this order'}
                              </option>
                              {val && !salesOrderItems[String(row.sales_order || '')]?.some((entry) => entry.name === val) && (
                                <option value={val}>{row.item_code || val}</option>
                              )}
                              {(salesOrderItems[String(row.sales_order || '')] || []).map((item) => (
                                <option key={item.name} value={item.name}>
                                  {[item.item_code, item.item_name].filter(Boolean).join(' — ')} · available {item.available_qty} {item.stock_uom || ''}
                                </option>
                              ))}
                            </select>
                            {salesOrderItemErrors[String(row.sales_order || '')] && (
                              <div className="mt-1 text-[10px] text-rose-600">{salesOrderItemErrors[String(row.sales_order || '')]}</div>
                            )}
                            {row.item_code && <div className="mt-1 text-[10px] text-slate-500 truncate">{row.item_code}</div>}
                          </div>
                        ) : col.fieldtype === 'Link' && col.options ? (
                          <div className="relative min-w-36">
                            <input
                              type="text"
                              value={val}
                              onFocus={async () => {
                                try {
                                  const filters = tableDocType === 'Vehicle Allocation Order' && col.fieldname === 'sales_order' ? { docstatus: 1 } : {};
                                  const options = await attachmentService.searchLink(col.options!, String(val || ''), filters);
                                  setLinkOptions((current) => ({ ...current, [`${idx}:${col.fieldname}`]: options }));
                                } catch { /* Keep the current value visible if lookup is unavailable. */ }
                              }}
                              onChange={async (e) => {
                                const text = e.target.value;
                                handleCellChange(idx, col.fieldname, text);
                                try {
                                  const filters = tableDocType === 'Vehicle Allocation Order' && col.fieldname === 'sales_order' ? { docstatus: 1 } : {};
                                  const options = await attachmentService.searchLink(col.options!, text, filters);
                                  setLinkOptions((current) => ({ ...current, [`${idx}:${col.fieldname}`]: options }));
                                } catch { /* Keep manual entry; ERP validates on save. */ }
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                              placeholder={`Search ${col.options}...`}
                            />
                            {(linkOptions[`${idx}:${col.fieldname}`]?.length ?? 0) > 0 && (
                              <div className="absolute z-30 left-0 right-0 top-full max-h-36 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg">
                                {linkOptions[`${idx}:${col.fieldname}`].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      handleCellChange(idx, col.fieldname, option.value);
                                      setLinkOptions((current) => ({ ...current, [`${idx}:${col.fieldname}`]: [] }));
                                    }}
                                    className="block w-full text-left px-2 py-1.5 hover:bg-slate-50 truncate"
                                  >
                                    {option.value}{option.description ? ` — ${option.description}` : ''}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type={isNum ? 'number' : 'text'}
                            value={val}
                            onChange={(e) =>
                              handleCellChange(
                                idx,
                                col.fieldname,
                                isNum ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                              )
                            }
                            className={`w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none ${
                              isNum ? 'text-right font-mono' : ''
                            }`}
                          />
                        )}
                      </td>
                    );
                  })}
                  {!readOnly ? (
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
