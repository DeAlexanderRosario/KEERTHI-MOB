import React from 'react';
import {
  Home,
  Users,
  Sparkles,
  BarChart2,
  Grid,
} from 'lucide-react';

interface MobileFloatingNavProps {
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
  onOpenMore: () => void;
}

export function MobileFloatingNav({
  activeModuleId,
  onSelectModule,
  onOpenMore,
}: MobileFloatingNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'sales', label: 'Customers', icon: Users },
    { id: 'billing', label: 'Billing', icon: Sparkles },
    { id: 'reports', label: 'Analytics', icon: BarChart2 },
  ];

  const isMoreActive = !['dashboard', 'sales', 'billing', 'reports'].includes(activeModuleId);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 lg:hidden w-auto">
      <nav
        aria-label="Mobile Navigation"
        className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.12)] rounded-full p-1.5 flex items-center gap-1.5"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModuleId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              aria-label={item.label}
              className={`flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'w-11 h-11 bg-[#0f1115] text-white rounded-full shadow-sm scale-105'
                  : 'w-10 h-10 text-slate-500 hover:text-slate-900 active:scale-95 rounded-full'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
            </button>
          );
        })}

        <button
          onClick={onOpenMore}
          aria-label="All Modules"
          className={`flex items-center justify-center transition-all duration-200 ${
            isMoreActive
              ? 'w-11 h-11 bg-[#0f1115] text-white rounded-full shadow-sm scale-105'
              : 'w-10 h-10 text-slate-500 hover:text-slate-900 active:scale-95 rounded-full'
          }`}
        >
          <Grid className="w-4 h-4 shrink-0" />
        </button>
      </nav>
    </div>
  );
}
