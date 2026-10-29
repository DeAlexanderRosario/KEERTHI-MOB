import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Key,
  UserCheck,
  Lock,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { metadataService } from '../../services/metadataService';

export function SettingsDiagnosticsModule() {
  const user = authService.getUser();
  const [pingData, setPingData] = useState<{
    status?: string;
    serverBaseUrl?: string;
    statusCode?: number;
    latencyMs?: number;
    timestamp?: string;
    error?: string;
  } | null>(null);

  const [isPinging, setIsPinging] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const runPing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/erp/diagnostics/ping');
      const data = await res.json();
      setPingData(data);
    } catch (err: any) {
      setPingData({
        status: 'offline',
        error: err.message,
      });
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    runPing();
  }, []);

  const handleClearCache = () => {
    metadataService.clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            System Diagnostics & Integration Health
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time server probe, authenticated session inspection, and security audit.
          </p>
        </div>

        <button
          onClick={runPing}
          disabled={isPinging}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
          Test Connection
        </button>
      </div>

      {/* Server Probe Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                pingData?.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">ERPNext v16 Target Host</h3>
              <p className="text-xs font-mono text-slate-500">
                {pingData?.serverBaseUrl || 'https://erp.keerthigroup.co.in'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pingData?.status === 'online' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected ({pingData.latencyMs}ms)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unreachable
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">HTTP Status</span>
            <span className="font-mono font-semibold text-slate-800">
              {pingData?.statusCode ? `${pingData.statusCode} OK` : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Round-Trip Latency</span>
            <span className="font-mono font-semibold text-slate-800">
              {pingData?.latencyMs ? `${pingData.latencyMs} ms` : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Probe Timestamp</span>
            <span className="font-mono text-slate-600 text-[11px]">
              {pingData?.timestamp ? pingData.timestamp.slice(11, 19) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Authenticated User Session Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Current Session State</h3>
            <p className="text-xs text-slate-500">
              {user ? `Active session for ${user.user}` : 'No active session'}
            </p>
          </div>
        </div>

        {user ? (
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 text-[11px] block">User Email / Username</span>
                <span className="font-mono font-medium text-slate-900">{user.email}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Full Name</span>
                <span className="font-medium text-slate-900">{user.fullName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Assigned Company</span>
                <span className="font-medium text-slate-900">{user.company || 'Default Company'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Operating Currency</span>
                <span className="font-mono font-medium text-slate-900">{user.currency || 'INR'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block mb-1.5">
                Actual ERPNext Assigned Roles ({user.roles.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-500 border-t border-slate-100">
            You are currently browsing as an unauthenticated guest. Sign in to access ERPNext.
          </div>
        )}
      </div>

      {/* Security & Cache Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Cache Management</h3>
            <p className="text-xs text-slate-500">HttpOnly session proxy, Same-Origin CSRF enforcement</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">Session Cookie Security</div>
              <div className="text-[11px] text-slate-500">
                ERPNext `sid` and `csrf_token` stored in HttpOnly cookies to prevent XSS exfiltration
              </div>
            </div>
            <span className="font-mono text-emerald-600 text-xs font-semibold">Active (HttpOnly)</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">DocType Schema Cache</div>
              <div className="text-[11px] text-slate-500">In-memory schema cache for faster form rendering</div>
            </div>
            <button
              onClick={handleClearCache}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              {cacheCleared ? 'Cache Cleared!' : 'Clear Cache'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
