import React, { useState, useEffect } from 'react';
import { Menu, ArrowRightLeft } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileFloatingNav } from './components/layout/MobileFloatingNav';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardModule } from './components/modules/DashboardModule';
import { BillingModule } from './components/modules/BillingModule';
import { AccountsModule } from './components/modules/AccountsModule';
import { SalesModule } from './components/modules/SalesModule';
import { PurchasesModule } from './components/modules/PurchasesModule';
import { StockModule } from './components/modules/StockModule';
import { DeliveryModule } from './components/modules/DeliveryModule';
import { HrModule } from './components/modules/HrModule';
import { ReportsHubModule } from './components/modules/ReportsHubModule';
import { SettingsDiagnosticsModule } from './components/modules/SettingsDiagnosticsModule';
import { authService } from './services/authService';
import type { SessionUser } from './services/types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(authService.getUser());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'app' | 'login'>('app');

  const [activeModuleId, setActiveModuleId] = useState<string>('dashboard');
  const [activeSubView, setActiveSubView] = useState<string | undefined>(undefined);
  const [activeDocName, setActiveDocName] = useState<string | undefined>(undefined);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Subscribe to auth state changes and initialize session
  useEffect(() => {
    const unsubscribe = authService.subscribe((u, health) => {
      setCurrentUser(u);
    });

    authService.initialize().finally(() => {
      setIsInitializing(false);
    });

    return unsubscribe;
  }, []);

  const handleNavigate = (moduleId: string, view?: string, docName?: string) => {
    setActiveModuleId(moduleId);
    setActiveSubView(view);
    setActiveDocName(docName);
    setIsMobileNavOpen(false);
  };

  // If user explicitly chose the separate login page
  if (viewMode === 'login') {
    return (
      <LoginPage
        onSuccess={() => {
          setViewMode('app');
          handleNavigate('dashboard');
        }}
        onContinueGuest={() => setViewMode('app')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col font-sans text-slate-900 selection:bg-lime-400 selection:text-black">
      {/* Top Header */}
      <Header
        onOpenLogin={() => setViewMode('login')}
        onSelectModule={(id) => handleNavigate(id)}
        activeModuleId={activeModuleId}
      />

      {/* Mobile Top Bar (Quick Breadcrumb & Drawer Opener) */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white/90 border-b border-slate-200/80 backdrop-blur-xs">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg active:scale-95 transition-all"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>All Modules</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold capitalize text-slate-900 tracking-tight">
            {activeModuleId}
          </span>
          {!currentUser && (
            <button
              onClick={() => setViewMode('login')}
              className="text-[11px] text-lime-700 font-semibold px-2 py-0.5 bg-lime-50 rounded-full border border-lime-200"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body with Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeModuleId={activeModuleId}
          onSelectModule={(id) => handleNavigate(id)}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-8">
          {activeModuleId === 'dashboard' && (
            <DashboardModule
              onNavigateModule={handleNavigate}
              onOpenLogin={() => setViewMode('login')}
            />
          )}

          {activeModuleId === 'billing' && <BillingModule />}

          {activeModuleId === 'accounts' && (
            <AccountsModule
              initialSubTab={activeSubView || 'sales_invoices'}
              initialDocName={activeDocName}
            />
          )}

          {activeModuleId === 'sales' && (
            <SalesModule
              initialDocType={activeSubView === 'sales_orders' ? 'Sales Order' : 'Customer'}
              initialDocName={activeDocName}
            />
          )}

          {activeModuleId === 'purchases' && (
            <PurchasesModule
              initialDocType={activeSubView || 'Supplier'}
              initialDocName={activeDocName}
            />
          )}

          {activeModuleId === 'stock' && (
            <StockModule
              initialDocType={activeSubView || 'Item'}
              initialDocName={activeDocName}
            />
          )}

          {activeModuleId === 'delivery' && <DeliveryModule />}

          {activeModuleId === 'hr' && <HrModule />}

          {activeModuleId === 'reports' && <ReportsHubModule />}

          {activeModuleId === 'settings' && <SettingsDiagnosticsModule />}
        </main>
      </div>

      {/* Modern Floating Bottom Nav on Mobile (inspired by reference image) */}
      <MobileFloatingNav
        activeModuleId={activeModuleId}
        onSelectModule={(id) => handleNavigate(id)}
        onOpenMore={() => setIsMobileNavOpen(true)}
      />
    </div>
  );
}
