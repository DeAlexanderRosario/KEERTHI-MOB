import React from 'react';
import {
  Home,
  Store,
  Truck,
  Sparkles,
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
    { id: 'field_sales', label: 'Field Sales', icon: Store },
    { id: 'delivery', label: 'Driver', icon: Truck },
    { id: 'billing', label: 'Billing', icon: Sparkles },
  ];

  const isMoreActive = !['dashboard', 'field_sales', 'delivery', 'billing'].includes(activeModuleId);

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 lg:hidden w-auto pointer-events-auto">
      <nav
        aria-label="Mobile Navigation"
        className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.12)] rounded-full p-1.5 flex items-center gap-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModuleId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              aria-label={item.label}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] transition-all duration-200 ${
                isActive
                  ? 'w-11 h-11 bg-[#0f1115] text-white rounded-full shadow-sm scale-105'
                  : 'w-11 h-11 text-slate-500 hover:text-slate-900 active:scale-95 rounded-full'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
            </button>
          );
        })}

        <button
          onClick={onOpenMore}
          aria-label="All Modules"
          className={`flex items-center justify-center min-w-[44px] min-h-[44px] transition-all duration-200 ${
            isMoreActive
              ? 'w-11 h-11 bg-[#0f1115] text-white rounded-full shadow-sm scale-105'
              : 'w-11 h-11 text-slate-500 hover:text-slate-900 active:scale-95 rounded-full'
          }`}
        >
          <Grid className="w-4 h-4 shrink-0" />
        </button>
      </nav>
    </div>
  );
}
