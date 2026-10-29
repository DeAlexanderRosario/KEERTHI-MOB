import React, { useState, useEffect } from 'react';
import {
  LogOut,
  User as UserIcon,
  Shield,
  ArrowRightLeft,
  LayoutGrid,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { resolvePrimaryPersona } from '../../config/personas';
import type { SessionUser } from '../../services/types';

interface HeaderProps {
  onOpenLogin: () => void;
  onSelectModule: (moduleId: string) => void;
  activeModuleId: string;
  onOpenDrawer?: () => void;
}

export function Header({
  onOpenLogin,
  onSelectModule,
  activeModuleId,
  onOpenDrawer,
}: HeaderProps) {
  const [user, setUser] = useState<SessionUser | null>(authService.getUser());
  const [serverStatus, setServerStatus] = useState<{ online: boolean; latencyMs?: number }>({
    online: true,
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => setUser(u));
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkPing = async () => {
      try {
        const res = await fetch('/api/erp/diagnostics/ping');
        const data = await res.json();
        if (mounted) {
          setServerStatus({
            online: data.status === 'online',
            latencyMs: data.latencyMs,
          });
        }
      } catch {
        if (mounted) setServerStatus({ online: false });
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const persona = user ? resolvePrimaryPersona(user.roles) : null;

  const topNavTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'billing', label: 'Billing' },
    { id: 'sales', label: 'Sales' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'stock', label: 'Inventory' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <header className="h-16 border-b border-slate-200/70 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Brand & Left Navigation */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onSelectModule('dashboard')}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 bg-[#0f1115] text-white rounded-xl flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-slate-600 transition-colors">
              KEERTHI ERP
            </span>
          </div>
        </button>

        {/* Clean Desktop Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1">
          {topNavTabs.map((tab) => {
            const isActive = activeModuleId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectModule(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#0f1115] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>More</span>
            </button>
          )}
        </nav>
      </div>

      {/* Right zone: Live ping dot, User profile, Login action */}
      <div className="flex items-center gap-3">
        {/* Minimalist Live Status Dot */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              serverStatus.online ? 'bg-lime-500' : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] font-mono text-slate-500">
            {serverStatus.latencyMs !== undefined ? `${serverStatus.latencyMs}ms` : 'v16 Live'}
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            {persona && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-full font-mono">
                {persona.label}
              </span>
            )}

            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-semibold text-xs border border-slate-200/80">
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                  {user.fullName || user.user}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenLogin}
              title="Switch Account"
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => authService.logout()}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black active:scale-95 rounded-full shadow-xs transition-all"
          >
            <UserIcon className="w-3.5 h-3.5 text-lime-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
