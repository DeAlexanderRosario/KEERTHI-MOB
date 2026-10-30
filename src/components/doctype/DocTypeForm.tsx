import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Trash2,
  AlertCircle,
  FileCheck,
  Search,
  Eye,
  FileEdit,
} from 'lucide-react';
import { metadataService } from '../../services/metadataService';
import { documentService } from '../../services/documentService';
import { permissionService } from '../../services/permissionService';
import { attachmentService } from '../../services/attachmentService';
import { StatusBadge } from '../common/StatusBadge';
import { ErrorBanner } from '../common/ErrorBanner';
import { ChildTableEditor } from './ChildTableEditor';
import { CustomerDetail360 } from '../views/CustomerDetail360';
import { EmployeeDetail360 } from '../views/EmployeeDetail360';
import { ItemDetail360 } from '../views/ItemDetail360';
import type { DocTypeMeta, DocField, ERPDocument } from '../../services/types';

interface DocTypeFormProps {
  doctype: string;
  docName?: string; // If undefined, creating new document
  onBack: () => void;
  onSaved?: (doc: ERPDocument) => void;
  onNavigateDoc?: (doctype: string, docName: string) => void;
  initialValues?: Record<string, any>;
}

export function DocTypeForm({
  doctype,
  docName,
  onBack,
  onSaved,
  onNavigateDoc,
  initialValues = {},
}: DocTypeFormProps) {
  const isNew = !docName;
  const [meta, setMeta] = useState<DocTypeMeta | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({ ...initialValues });
  const [docstatus, setDocstatus] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Link search state
  const [linkOptions, setLinkOptions] = useState<Record<string, Array<{ value: string; description?: string }>>>({});

  // 360 overview tab state for supported master DocTypes
  const has360View = !isNew && (doctype === 'Customer' || doctype === 'Employee' || doctype === 'Item');
  const [activeViewMode, setActiveViewMode] = useState<'360' | 'form'>(has360View ? '360' : 'form');

  // Load Meta and Document (if editing)
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      metadataService.getDocTypeMeta(doctype),
      !isNew && docName ? documentService.get(doctype, docName) : Promise.resolve(null),
    ])
      .then(([m, existingDoc]) => {
        if (!active) return;
        setMeta(m);

        if (existingDoc) {
          setFormData(existingDoc);
          setDocstatus(existingDoc.docstatus ?? 0);
        } else {
          // Fill default values from meta
          const defaults: Record<string, any> = { ...initialValues };
          for (const field of m.fields) {
            if (field.default !== undefined && defaults[field.fieldname] === undefined) {
              if (field.fieldtype === 'Check') {
                defaults[field.fieldname] = field.default === '1' || field.default === 1 ? 1 : 0;
              } else {
                defaults[field.fieldname] = field.default;
              }
            }
            if (field.fieldtype === 'Table' && defaults[field.fieldname] === undefined) {
              defaults[field.fieldname] = [];
            }
          }
          setFormData(defaults);
          setDocstatus(0);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctype, docName, isNew]);

  const handleFieldChange = (fieldname: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldname]: value }));
  };

  const handleLinkSearch = async (fieldname: string, targetDocType: string, txt: string) => {
    try {
      const results = await attachmentService.searchLink(targetDocType, txt);
      setLinkOptions((prev) => ({ ...prev, [fieldname]: results }));
    } catch {
      // Ignore lookup failure
    }
  };

  const handleSave = async () => {
    if (!meta) return;

    // Validate mandatory fields
    const mandatoryFields = metadataService.getMandatoryFields(meta);
    for (const f of mandatoryFields) {
      const val = formData[f.fieldname];
      if (val === undefined || val === null || val === '') {
        setError(new Error(`Mandatory field "${f.label || f.fieldname}" is required.`));
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let savedDoc: ERPDocument;
      if (isNew) {
        savedDoc = await documentService.create(doctype, formData);
        setSuccessMessage(`Document ${savedDoc.name} created successfully.`);
      } else {
        savedDoc = await documentService.update(doctype, docName!, formData);
        setSuccessMessage(`Document ${savedDoc.name} updated successfully.`);
      }

      setFormData(savedDoc);
      setDocstatus(savedDoc.docstatus ?? 0);
      onSaved?.(savedDoc);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitDoc = async () => {
    if (!docName) return;
    if (!window.confirm(`Submit ${doctype} ${docName}? This makes the document permanent in ERPNext.`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const submittedDoc = await documentService.submit(doctype, docName);
      setFormData(submittedDoc);
      setDocstatus(submittedDoc.docstatus ?? 1);
      setSuccessMessage(`Document ${submittedDoc.name} submitted successfully.`);
      onSaved?.(submittedDoc);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDoc = async () => {
    if (!docName) return;
    if (!window.confirm(`Cancel ${doctype} ${docName}? This will reverse the transaction in ERPNext.`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const cancelledDoc = await documentService.cancel(doctype, docName);
      setFormData(cancelledDoc);
      setDocstatus(cancelledDoc.docstatus ?? 2);
      setSuccessMessage(`Document ${cancelledDoc.name} cancelled successfully.`);
      onSaved?.(cancelledDoc);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!docName) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${doctype} ${docName}?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      await documentService.delete(doctype, docName);
      onBack();
    } catch (err: any) {
      setError(err);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs text-slate-500">Loading {doctype} schema and data from ERPNext...</span>
      </div>
    );
  }

  const isReadOnly = docstatus === 1 || docstatus === 2;
  const isSubmittable = Boolean(meta?.is_submittable);
  const canWrite = permissionService.canWrite(meta);
  const canSubmit = permissionService.canSubmit(meta);
  const canCancel = permissionService.canCancel(meta);
  const canDelete = permissionService.canDelete(meta);

  // Group fields into primary fields and child tables
  const standardFields = meta ? metadataService.getFormFields(meta).filter((f) => f.fieldtype !== 'Table') : [];
  const childTableFields = meta ? metadataService.getChildTableFields(meta) : [];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 bg-white p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-mono">
                {isNew ? `New ${doctype}` : docName}
              </h2>
              {isSubmittable && <StatusBadge docstatus={docstatus} status={formData.status} />}
            </div>
            <div className="text-xs text-slate-500">
              {doctype} {formData.company ? `· ${formData.company}` : ''}
            </div>
          </div>
        </div>

        {/* Action Buttons & 360 View Mode Toggles */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {has360View && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mr-2">
              <button
                type="button"
                onClick={() => setActiveViewMode('360')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeViewMode === '360'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>360 Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('form')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeViewMode === 'form'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                <span>Form Editor</span>
              </button>
            </div>
          )}

          {activeViewMode === 'form' && (
            <>
              {!isReadOnly && canWrite && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
              )}

              {!isNew && isSubmittable && docstatus === 0 && canSubmit && (
                <button
                  type="button"
                  onClick={handleSubmitDoc}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Submit
                </button>
              )}

              {!isNew && isSubmittable && docstatus === 1 && canCancel && (
                <button
                  type="button"
                  onClick={handleCancelDoc}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}

              {!isNew && !isReadOnly && canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteDoc}
                  disabled={isSaving}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <FileCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* RENDER 360 OVERVIEW IF ACTIVE */}
      {has360View && activeViewMode === '360' && (
        <>
          {doctype === 'Customer' && (
            <CustomerDetail360
              customerName={docName!}
              customerDoc={{ ...formData, name: docName! } as ERPDocument}
              onNavigateDoc={onNavigateDoc}
              onSwitchToEdit={() => setActiveViewMode('form')}
            />
          )}

          {doctype === 'Employee' && (
            <EmployeeDetail360
              employeeName={docName!}
              employeeDoc={{ ...formData, name: docName! } as ERPDocument}
              onSwitchToEdit={() => setActiveViewMode('form')}
            />
          )}

          {doctype === 'Item' && (
            <ItemDetail360
              itemCode={docName!}
              itemDoc={{ ...formData, name: docName! } as ERPDocument}
              onNavigateDoc={onNavigateDoc}
              onSwitchToEdit={() => setActiveViewMode('form')}
            />
          )}
        </>
      )}

      {/* RENDER FORM EDITOR IF IN FORM MODE */}
      {(!has360View || activeViewMode === 'form') && (
        <div className="space-y-4">
          {/* Primary Form Fields Container */}
          <div className="bg-white p-5 sm:p-6 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardFields.map((field) => {
                const value = formData[field.fieldname] ?? '';
                const isFieldReadOnly = isReadOnly || Boolean(field.read_only);

                return (
                  <div key={field.fieldname} className="space-y-1 scroll-mb-28">
                    <label className="block text-xs font-semibold text-slate-700">
                      {field.label || field.fieldname}
                      {field.reqd ? <span className="text-rose-500 ml-0.5">*</span> : null}
                    </label>

                    {field.fieldtype === 'Check' ? (
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          disabled={isFieldReadOnly}
                          onChange={(e) => handleFieldChange(field.fieldname, e.target.checked ? 1 : 0)}
                          className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    ) : field.fieldtype === 'Select' ? (
                      <select
                        value={value}
                        disabled={isFieldReadOnly}
                        onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      >
                        <option value="">Select {field.label}...</option>
                        {String(field.options || '')
                          .split('\n')
                          .filter(Boolean)
                          .map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                      </select>
                    ) : field.fieldtype === 'Link' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={value}
                          disabled={isFieldReadOnly}
                          onChange={(e) => {
                            handleFieldChange(field.fieldname, e.target.value);
                            if (field.options) {
                              handleLinkSearch(field.fieldname, field.options, e.target.value);
                            }
                          }}
                          onFocus={() => {
                            if (field.options && !linkOptions[field.fieldname]) {
                              handleLinkSearch(field.fieldname, field.options, '');
                            }
                          }}
                          placeholder={`Search ${field.options || 'Link'}...`}
                          className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                        />
                        {linkOptions[field.fieldname]?.length ? (
                          <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 text-xs">
                            {linkOptions[field.fieldname].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  handleFieldChange(field.fieldname, opt.value);
                                  setLinkOptions((prev) => ({ ...prev, [field.fieldname]: [] }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                              >
                                <span className="font-medium text-slate-800">{opt.value}</span>
                                {opt.description && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                    {opt.description}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : field.fieldtype === 'Date' ? (
                      <input
                        type="date"
                        value={value ? String(value).slice(0, 10) : ''}
                        disabled={isFieldReadOnly}
                        onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      />
                    ) : field.fieldtype === 'Datetime' ? (
                      <input
                        type="datetime-local"
                        value={value ? String(value).slice(0, 16) : ''}
                        disabled={isFieldReadOnly}
                        onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      />
                    ) : field.fieldtype === 'Text' || field.fieldtype === 'Text Editor' ? (
                      <textarea
                        rows={3}
                        value={value}
                        disabled={isFieldReadOnly}
                        onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      />
                    ) : field.fieldtype === 'Currency' || field.fieldtype === 'Float' || field.fieldtype === 'Int' ? (
                      <input
                        type="number"
                        step={field.fieldtype === 'Int' ? '1' : '0.01'}
                        value={value}
                        disabled={isFieldReadOnly}
                        onChange={(e) =>
                          handleFieldChange(
                            field.fieldname,
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        disabled={isFieldReadOnly}
                        onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-[#fbfcfd] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 disabled:bg-slate-50"
                      />
                    )}

                    {field.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{field.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Child Tables Section */}
          {childTableFields.map((tableField) => {
            const rows = Array.isArray(formData[tableField.fieldname])
              ? formData[tableField.fieldname]
              : [];

            return (
              <div key={tableField.fieldname} className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  {tableField.label || tableField.fieldname}
                </h3>
                <ChildTableEditor
                  tableDocType={tableField.options!}
                  rows={rows}
                  readOnly={isReadOnly}
                  onChange={(updatedRows) => handleFieldChange(tableField.fieldname, updatedRows)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
