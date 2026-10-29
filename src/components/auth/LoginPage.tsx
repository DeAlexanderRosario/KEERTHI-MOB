import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { PERSONA_DEFINITIONS } from '../../config/personas';

interface LoginPageProps {
  onSuccess: () => void;
  onContinueGuest?: () => void;
}

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem('keerthi_remembered_username') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRoleGuide, setShowRoleGuide] = useState<boolean>(false);

  // Live upstream ERPNext status
  const [pingStatus, setPingStatus] = useState<{
    online: boolean;
    latencyMs?: number;
    checked: boolean;
  }>({
    online: true,
    checked: false,
  });

  useEffect(() => {
    let mounted = true;
    fetch('/api/erp/diagnostics/ping')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setPingStatus({
            online: data.status === 'online',
            latencyMs: data.latencyMs,
            checked: true,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setPingStatus({
            online: false,
            checked: true,
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your ERPNext username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (rememberMe) {
        try {
          localStorage.setItem('keerthi_remembered_username', username.trim());
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem('keerthi_remembered_username');
        } catch {
          // ignore
        }
      }

      await authService.login(username.trim(), password);
      setIsLoading(false);
      onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your ERPNext credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top minimal status indicator */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-900" />
          <span className="font-semibold text-slate-900 tracking-tight">KEERTHI</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 font-mono text-[11px]">ERPNext v16</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200/70 rounded-full shadow-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              pingStatus.online ? 'bg-lime-500' : 'bg-rose-500'
            }`}
          />
          <span className="font-mono text-[11px] text-slate-600">
            {pingStatus.latencyMs !== undefined ? `${pingStatus.latencyMs}ms` : 'online'}
          </span>
        </div>
      </div>

      {/* Main Minimalist Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-white rounded-[32px] border border-slate-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-10 space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">
            Enterprise Portal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Enter your credentials to access live business accounts, orders, and inventory.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug break-words">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="administrator or user@keerthigroup.co.in"
                required
                disabled={isLoading}
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 text-xs bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-[11px]">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => setShowRoleGuide(!showRoleGuide)}
              className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-[11px]"
            >
              <span>Roles & permissions</span>
              {showRoleGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 h-12 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black active:scale-[0.99] disabled:bg-slate-400 rounded-2xl shadow-sm transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-lime-400" />
              </>
            )}
          </button>
        </form>

        {/* Roles Accordion */}
        {showRoleGuide && (
          <div className="pt-2 border-t border-slate-100 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Available Role Permissions</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {PERSONA_DEFINITIONS.map((p) => (
                <div
                  key={p.key}
                  className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-mono text-slate-700"
                >
                  <span className="font-semibold block text-slate-900">{p.label}</span>
                  <span className="text-[10px] text-slate-400">{p.defaultModule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onContinueGuest && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onContinueGuest}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              Continue as guest &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400">
        Keerthi Groups ERP · Real ERPNext v16 API Integration · Zero Mock Data
      </div>
    </div>
  );
}
