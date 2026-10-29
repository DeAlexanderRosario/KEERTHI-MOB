import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  TrendingUp,
  ShoppingBag,
  Boxes,
  Truck,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { BUSINESS_MODULES } from '../../config/modules';
import { authService } from '../../services/authService';

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  Receipt: <Receipt className="w-4 h-4 shrink-0" />,
  Calculator: <Calculator className="w-4 h-4 shrink-0" />,
  TrendingUp: <TrendingUp className="w-4 h-4 shrink-0" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4 shrink-0" />,
  Boxes: <Boxes className="w-4 h-4 shrink-0" />,
  Truck: <Truck className="w-4 h-4 shrink-0" />,
  Users: <Users className="w-4 h-4 shrink-0" />,
  FileSpreadsheet: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 shrink-0" />,
};

export function Sidebar({
  activeModuleId,
  onSelectModule,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const user = authService.getUser();
  const userRoles = user?.roles || [];

  const visibleModules = BUSINESS_MODULES.filter((mod) => {
    if (mod.requiredRoles.includes('All')) return true;
    if (!user) return false;
    if (userRoles.includes('Administrator') || userRoles.includes('System Manager')) return true;
    return mod.requiredRoles.some((r) => userRoles.includes(r));
  });

  const content = (
    <div className="w-72 bg-white text-slate-800 flex flex-col h-full border-r border-slate-200/70 select-none shadow-sm">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
            Navigation
          </span>
          <span className="text-sm font-bold text-slate-900">ERP Modules</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleModules.map((mod) => {
          const isActive = mod.id === activeModuleId;
          const icon = ICON_MAP[mod.icon] || <LayoutDashboard className="w-4 h-4 shrink-0" />;

          return (
            <button
              key={mod.id}
              onClick={() => {
                onSelectModule(mod.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-medium rounded-2xl transition-all text-left ${
                isActive
                  ? 'bg-[#0f1115] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <span className={isActive ? 'text-lime-400' : 'text-slate-400'}>
                  {icon}
                </span>
                <span className="truncate">{mod.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-lime-400 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer system status */}
      <div className="p-4 border-t border-slate-100 bg-[#f8f9fa] text-[11px] text-slate-500 rounded-b-2xl m-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-700">Live Backend</span>
          <span className="text-lime-600 font-mono text-[10px] font-bold">v16 Online</span>
        </div>
        <p className="font-mono text-[10px] text-slate-400 truncate">
          erp.keerthigroup.co.in
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
