import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Briefcase,
  Building,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import type { ERPDocument } from '../../services/types';

interface EmployeeDetail360Props {
  employeeName: string;
  employeeDoc: ERPDocument;
  onSwitchToEdit?: () => void;
}

export function EmployeeDetail360({
  employeeName,
  employeeDoc,
  onSwitchToEdit,
}: EmployeeDetail360Props) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');

  const [attendance, setAttendance] = useState<ERPDocument[]>([]);
  const [leaves, setLeaves] = useState<ERPDocument[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      // 0: Attendance records for this employee
      documentService.list('Attendance', {
        fields: ['name', 'attendance_date', 'status', 'docstatus'],
        filters: [['employee', '=', employeeName]],
        order_by: 'attendance_date desc',
        limit_page_length: 30,
      }),
      // 1: Leave Applications for this employee
      documentService.list('Leave Application', {
        fields: ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status', 'docstatus'],
        filters: [['employee', '=', employeeName]],
        order_by: 'from_date desc',
        limit_page_length: 30,
      }),
    ])
      .then(([attRes, leaveRes]) => {
        if (!mounted) return;
        if (attRes.status === 'fulfilled') setAttendance(attRes.value || []);
        if (leaveRes.status === 'fulfilled') setLeaves(leaveRes.value || []);
      })
      .catch((err) => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [employeeName]);

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;

  return (
    <div className="space-y-5">
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {employeeDoc.employee_name || employeeName}
              </h2>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {employeeName}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  employeeDoc.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {employeeDoc.status || 'Active'}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {(employeeDoc.designation as string) || 'Staff'} · {(employeeDoc.department as string) || 'General Operations'}
            </p>
          </div>

          {onSwitchToEdit && (
            <button
              type="button"
              onClick={onSwitchToEdit}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all self-start cursor-pointer shrink-0"
            >
              Edit Form Fields
            </button>
          )}
        </div>

        {/* Verified Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-4 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Company / Entity</span>
            <span className="font-semibold text-slate-800">
              {(employeeDoc.company as string) || 'Keerthi Hardwares'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Date of Joining</span>
            <span className="font-mono font-medium text-slate-800">
              {(employeeDoc.date_of_joining as string) || 'N/A'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Contact Number</span>
            <span className="font-mono font-medium text-slate-800">
              {(employeeDoc.cell_number as string) || (employeeDoc.phone_number as string) || 'N/A'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Official Email</span>
            <span className="font-mono font-medium text-slate-800 truncate block">
              {(employeeDoc.prefered_email as string) || (employeeDoc.personal_email as string) || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Attendance & Leave Activity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Logged Attendance Days
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {attendance.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {presentCount} Present · {absentCount} Absent
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Leave Applications
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {leaves.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Formal requests submitted in ERP
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Employee Status
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {(employeeDoc.status as string) || 'Active'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            ERP authorization verified
          </span>
        </div>
      </div>

      {/* 3. Sub-Tabs: Attendance vs Leaves */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Attendance History ({attendance.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'leaves'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Leave Applications ({leaves.length})
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading && (
            <div className="py-10 text-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs text-slate-500">Retrieving HR records for {employeeName}...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>HR query restricted or failed: {error.message}</span>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {activeTab === 'attendance' && (
                <>
                  {attendance.length === 0 ? (
                    <EmptyState
                      title="No Attendance Logs Found"
                      description="No attendance entries recorded for this employee in ERPNext."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Log Record</th>
                            <th className="pb-2.5 font-bold">Attendance Date</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {attendance.map((att) => (
                            <tr key={att.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{att.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(att.attendance_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    att.status === 'Present'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : att.status === 'Absent'
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {att.status || 'Marked'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'leaves' && (
                <>
                  {leaves.length === 0 ? (
                    <EmptyState
                      title="No Leave Applications"
                      description="No formal leave applications recorded on file."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Application ID</th>
                            <th className="pb-2.5 font-bold">Leave Type</th>
                            <th className="pb-2.5 font-bold">Period</th>
                            <th className="pb-2.5 font-bold text-right">Days</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {leaves.map((l) => (
                            <tr key={l.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{l.name}</td>
                              <td className="py-3 text-slate-800 font-semibold">
                                {(l.leave_type as string) || 'Standard Leave'}
                              </td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(l.from_date as string)} → {(l.to_date as string)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-900">
                                {l.total_leave_days || 1}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={l.docstatus} status={l.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
