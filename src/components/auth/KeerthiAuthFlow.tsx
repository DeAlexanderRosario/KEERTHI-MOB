import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Truck,
  FileSpreadsheet,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { PERSONA_DEFINITIONS } from '../../config/personas';

interface KeerthiAuthFlowProps {
  onSuccess: () => void;
  onExploreAsGuest?: () => void;
}

export function KeerthiLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green vertical pillar with angled top & bottom */}
      <path d="M16 12L36 22V88L16 78V12Z" fill="#22c55e" />
      {/* Upper diagonal arm in white */}
      <path d="M44 48L72 16H92L58 56L44 48Z" fill="#FFFFFF" />
      {/* Lower diagonal arm in white */}
      <path d="M44 60L58 53L92 90H72L44 60Z" fill="#FFFFFF" />
    </svg>
  );
}

function PhoneStatusBar() {
  return (
    <div className="flex items-center justify-between px-5 sm:px-6 pt-3 pb-1 text-white text-xs font-semibold select-none z-30 shrink-0">
      <span className="text-[12px] font-medium tracking-tight">9:41</span>
      {/* Dynamic Island pill */}
      <div className="w-22 sm:w-24 h-4.5 sm:h-5 bg-black/90 rounded-full flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800" />
      </div>
      <div className="flex items-center gap-1.5 text-white/90">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
        </svg>
        <span className="text-[10px] font-mono">5G</span>
        <div className="w-5 h-2.5 border border-white/80 rounded-sm p-0.5 flex items-center">
          <div className="h-full w-full bg-white rounded-2xs" />
        </div>
      </div>
    </div>
  );
}

export function KeerthiAuthFlow({ onSuccess, onExploreAsGuest }: KeerthiAuthFlowProps) {
  // Mobile flow screen: 'welcome' | 'login'
  const [currentMobileScreen, setCurrentMobileScreen] = useState<'welcome' | 'login'>('welcome');
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // Form states
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem('keerthi_remembered_username') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState<boolean>(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Live upstream ERPNext status
  const [pingStatus, setPingStatus] = useState<{
    online: boolean;
    latencyMs?: number;
  }>({ online: true });

  useEffect(() => {
    let mounted = true;
    fetch('/api/erp/diagnostics/ping')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setPingStatus({
            online: data.status === 'online',
            latencyMs: data.latencyMs,
          });
        }
      })
      .catch(() => {
        if (mounted) setPingStatus({ online: false });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (keepSignedIn) {
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
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleFillDemo = (personaKey: string) => {
    const p = (PERSONA_DEFINITIONS as Record<string, any>)[personaKey];
    if (p) {
      setUsername(p.testEmail);
      setPassword('admin');
      setShowMenuDropdown(false);
      if (usernameInputRef.current) {
        usernameInputRef.current.focus();
      }
    }
  };

  // ==========================================
  // 1. MOBILE EXPERIENCE (Matches uploaded image exactly)
  // ==========================================
  const renderPhoneView = () => (
    <div className="relative w-full max-w-md mx-auto min-h-[100dvh] h-[100dvh] bg-black sm:rounded-[44px] sm:ring-8 sm:ring-neutral-800/80 shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
      {/* iOS Status Bar */}
      <PhoneStatusBar />

      {/* Dynamic Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/hardware_bg.jpg"
          alt="Hardware Store Interior"
          className="w-full h-full object-cover object-center scale-105 filter brightness-[0.85] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70" />
      </div>

      <AnimatePresence mode="wait">
        {currentMobileScreen === 'welcome' ? (
          // PHONE SCREEN 1: SPLASH & WELCOME SCREEN
          <motion.div
            key="phone-welcome"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex-1 flex flex-col justify-between px-5 sm:px-6 pt-1 pb-6 overflow-y-auto no-scrollbar"
          >
            {/* Header: Logo & Branding */}
            <div className="flex items-center gap-2.5 pt-2 shrink-0">
              <KeerthiLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-md" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-white font-black tracking-wider text-sm sm:text-base drop-shadow-sm">
                  KEERTHI
                </span>
                <span className="text-white/80 font-semibold tracking-[0.22em] text-[8px] sm:text-[9px] mt-0.5">
                  HARDWARES
                </span>
              </div>
            </div>

            {/* Center Content: Headline & 4 Feature Pillars */}
            <div className="my-auto py-3 space-y-4">
              <div className="space-y-1.5">
                <h1 className="text-2xl xs:text-3xl sm:text-[34px] font-extrabold text-white leading-[1.12] tracking-tight">
                  Keerthi ERP
                  <span className="block font-extrabold">
                    for a <span className="text-[#3cd32d]">Smarter</span>
                  </span>
                  <span className="block text-[#3cd32d] font-extrabold">
                    Hardware Business
                  </span>
                </h1>
                <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed max-w-[340px]">
                  Manage sales, inventory, customers, purchases and accounts — all in one place.
                </p>
              </div>

              {/* 4 Feature Items (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-1">
                {/* 1. Sales & Billing */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#11311c]/90 border border-[#22c55e]/30 flex items-center justify-center shrink-0 shadow-sm">
                    <ShoppingCart className="w-4.5 h-4.5 text-[#3cd32d]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white leading-tight">Sales &amp; Billing</h2>
                    <p className="text-[9px] text-slate-300/80 leading-tight mt-0.5">
                      Quotes, orders &amp; invoices
                    </p>
                  </div>
                </div>

                {/* 2. Inventory */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#11311c]/90 border border-[#22c55e]/30 flex items-center justify-center shrink-0 shadow-sm">
                    <Package className="w-4.5 h-4.5 text-[#3cd32d]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white leading-tight">Inventory</h2>
                    <p className="text-[9px] text-slate-300/80 leading-tight mt-0.5">
                      Track stock &amp; warehouses
                    </p>
                  </div>
                </div>

                {/* 3. Customers */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#11311c]/90 border border-[#22c55e]/30 flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="w-4.5 h-4.5 text-[#3cd32d]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white leading-tight">Customers</h2>
                    <p className="text-[9px] text-slate-300/80 leading-tight mt-0.5">
                      Customer details &amp; credit
                    </p>
                  </div>
                </div>

                {/* 4. Reports */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#11311c]/90 border border-[#22c55e]/30 flex items-center justify-center shrink-0 shadow-sm">
                    <BarChart3 className="w-4.5 h-4.5 text-[#3cd32d]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white leading-tight">Reports</h2>
                    <p className="text-[9px] text-slate-300/80 leading-tight mt-0.5">
                      Business insights &amp; analytics
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Carousel Indicators & Get Started Button */}
            <div className="space-y-3 pt-2 shrink-0">
              <div className="flex items-center justify-center gap-1.5 pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSlide(0)}
                  aria-label="Slide 1"
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === 0 ? 'w-7 bg-[#3cd32d]' : 'w-2 bg-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setActiveSlide(1)}
                  aria-label="Slide 2"
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === 1 ? 'w-7 bg-[#3cd32d]' : 'w-2 bg-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setActiveSlide(2)}
                  aria-label="Slide 3"
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === 2 ? 'w-7 bg-[#3cd32d]' : 'w-2 bg-slate-700'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setCurrentMobileScreen('login')}
                className="w-full h-12 sm:h-14 bg-[#3cd32d] hover:bg-[#34bd28] active:scale-[0.98] text-slate-950 font-bold text-sm sm:text-base rounded-full flex items-center justify-center gap-2 shadow-[0_12px_32px_rgba(60,211,45,0.3)] transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
              </button>

              <div className="w-28 sm:w-32 h-1 bg-white/40 rounded-full mx-auto" />
            </div>
          </motion.div>
        ) : (
          // PHONE SCREEN 2: LOGIN SCREEN
          <motion.div
            key="phone-login"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar with Logo & Menu */}
            <div className="px-5 sm:px-6 pt-1 pb-3 flex items-center justify-between z-20 shrink-0">
              <div
                onClick={() => setCurrentMobileScreen('welcome')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <KeerthiLogo className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 drop-shadow-md group-hover:scale-105 transition-transform" />
                <div className="flex flex-col text-left leading-none">
                  <span className="text-white font-black tracking-wider text-xs sm:text-sm">
                    KEERTHI
                  </span>
                  <span className="text-white/80 font-semibold tracking-[0.2em] text-[7px] sm:text-[8px] mt-0.5">
                    HARDWARES
                  </span>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                  aria-label="Menu"
                >
                  <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showMenuDropdown && (
                  <div className="absolute right-0 top-10 sm:top-11 w-56 bg-white text-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-100 z-50 text-xs">
                    <div className="p-2 border-b border-slate-100 mb-1">
                      <span className="font-semibold text-slate-400 text-[10px] uppercase block">
                        Upstream ERP Server
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            pingStatus.online ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-mono text-[11px] text-slate-700">
                          {pingStatus.latencyMs ? `${pingStatus.latencyMs}ms ping` : 'erp.keerthigroup.co.in'}
                        </span>
                      </div>
                    </div>

                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                      Quick Demo Accounts
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillDemo('system_admin')}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg font-medium text-slate-800"
                    >
                      Administrator
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemo('order_biller')}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg font-medium text-slate-800"
                    >
                      Order Biller
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemo('accountant')}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg font-medium text-slate-800"
                    >
                      Accountant
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMobileScreen('welcome');
                          setShowMenuDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-slate-500 hover:text-slate-900 rounded-lg flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Back to Welcome</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hardware store background space */}
            <div className="flex-1 min-h-[36px] pointer-events-none" />

            {/* White Sliding Bottom Sheet */}
            <div className="bg-white text-slate-900 rounded-t-[32px] sm:rounded-t-[38px] px-5 sm:px-7 pt-6 sm:pt-7 pb-5 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] flex flex-col justify-between overflow-y-auto no-scrollbar">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight leading-tight">
                  Welcome Back
                </h2>
                <p className="text-slate-500 text-xs sm:text-[13px] mt-1 mb-4 leading-normal">
                  Sign in to your Keerthi ERP account to access your business.
                </p>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-3.5">
                  <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                    <div className="pl-4 pr-2 text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username or Email"
                      disabled={isLoading}
                      className="w-full py-3 sm:py-3.5 pr-4 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    />
                  </div>

                  <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                    <div className="pl-4 pr-2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      disabled={isLoading}
                      className="w-full py-3 sm:py-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] sm:text-xs">Keep me signed in</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'Please contact your Keerthi ERP Administrator at https://erp.keerthigroup.co.in to reset your credentials.'
                        )
                      }
                      className="font-semibold text-emerald-800 hover:text-emerald-950 transition-colors text-[11px] sm:text-xs"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 sm:h-13.5 bg-[#0e3b20] hover:bg-[#092b17] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-1"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Verifying with ERPNext...</span>
                      </>
                    ) : (
                      <>
                        <span>Login to ERP</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="pt-4 text-center space-y-2.5 shrink-0">
                <p className="text-[11px] text-slate-400 font-medium">
                  Keerthi Hardwares • ERPNext Powered
                </p>
                <div className="w-28 sm:w-32 h-1 bg-slate-300 rounded-full mx-auto" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ==========================================
  // 2. TABLET EXPERIENCE (Optimized for iPad / Touch Tablets 768px - 1023px)
  // ==========================================
  const renderTabletView = () => (
    <div className="w-full max-w-3xl bg-[#0f141c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto">
      {/* Tablet Left: Branding & Core Pillars */}
      <div className="relative md:w-5/12 p-6 sm:p-8 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-black">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <img
            src="/hardware_bg.jpg"
            alt="Hardware Store"
            className="w-full h-full object-cover filter blur-[1px]"
          />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2.5">
            <KeerthiLogo className="w-8 h-8 drop-shadow-md" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-white font-black tracking-wider text-sm">KEERTHI</span>
              <span className="text-emerald-400 font-bold tracking-[0.2em] text-[8px] mt-0.5">HARDWARES</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white leading-tight">
              Keerthi ERP <span className="text-[#3cd32d]">Tablet POS</span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Designed for store managers, inventory auditors, and point-of-sale checkout tablets.
            </p>
          </div>

          {/* Quick Pillar Badges */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <ShoppingCart className="w-4 h-4 text-[#3cd32d] shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Rapid POS Billing &amp; Counter Sales</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Package className="w-4 h-4 text-[#3cd32d] shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Aisle Stock Check &amp; Barcode Audit</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Users className="w-4 h-4 text-[#3cd32d] shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Customer Ledger &amp; Credit Control</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>ERPNext v16</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>

      {/* Tablet Right: Spacious Touch Login Form */}
      <div className="md:w-7/12 p-6 sm:p-8 bg-white text-slate-900 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">Staff Sign In</h3>
              <p className="text-slate-500 text-xs mt-0.5">Authenticate with your Keerthi ERP account.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Staff Preset Buttons */}
          <div className="mb-4 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
              Quick Staff Profile Fill
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('system_admin')}
                className="px-2 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Administrator
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('order_biller')}
                className="px-2 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Order Biller
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('accountant')}
                className="px-2 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Accountant
              </button>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Username or Work Email</label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-4 pr-2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. administrator or biller@keerthi.com"
                  disabled={isLoading}
                  className="w-full py-3.5 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ERP Password</label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-4 pr-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="w-full py-3.5 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Remember this tablet terminal</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert('Contact your system administrator at erp.keerthigroup.co.in to reset credentials.')
                }
                className="font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-13 bg-[#0e3b20] hover:bg-[#092b17] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Connecting to ERPNext v16...</span>
                </>
              ) : (
                <>
                  <span>Login to ERP Portal</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Keerthi Hardwares ERP</span>
          <span>Tablet POS &amp; Inventory Station</span>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 3. DESKTOP ENTERPRISE PORTAL (Full-screen Split-Pane for Desktop >= 1024px)
  // ==========================================
  const renderDesktopView = () => (
    <div className="w-full max-w-6xl min-h-[640px] h-[82vh] max-h-[820px] bg-[#0c1017] border border-white/10 rounded-3xl shadow-[0_32px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-row my-auto">
      {/* Desktop Left: Grand Brand Panorama & Enterprise Showcase */}
      <div className="relative w-7/12 p-10 lg:p-12 flex flex-col justify-between overflow-hidden">
        {/* Full Store Background with Rich Hardware Store Aesthetics */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/hardware_bg.jpg"
            alt="Hardware Store Interior"
            className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeerthiLogo className="w-10 h-10 drop-shadow-lg" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-white font-black tracking-widest text-lg drop-shadow-md">
                KEERTHI HARDWARES
              </span>
              <span className="text-[#3cd32d] font-bold tracking-[0.25em] text-[10px] mt-1">
                ENTERPRISE ERP PORTAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                pingStatus.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-xs text-slate-300">
              {pingStatus.latencyMs ? `${pingStatus.latencyMs}ms · erp.keerthigroup.co.in` : 'Upstream Live'}
            </span>
          </div>
        </div>

        {/* Center Hero Copy & 4 Enterprise Modules */}
        <div className="relative z-10 my-auto py-6 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-[46px] font-black text-white leading-[1.08] tracking-tight">
              Keerthi ERP
              <span className="block font-black">
                for a <span className="text-[#3cd32d]">Smarter</span>
              </span>
              <span className="block text-[#3cd32d] font-black">
                Hardware Business
              </span>
            </h1>
            <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-lg">
              Next-generation supply chain, point of sale, customer credit, and multi-warehouse control powered by ERPNext v16.
            </p>
          </div>

          {/* 4 Core Pillars Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2 max-w-lg">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-[#11311c] border border-[#22c55e]/40 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-[#3cd32d]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sales &amp; Billing</h4>
                <p className="text-[11px] text-slate-300/80 leading-snug mt-0.5">
                  Instant POS, GST invoices &amp; proforma quotes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-[#11311c] border border-[#22c55e]/40 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-[#3cd32d]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Inventory</h4>
                <p className="text-[11px] text-slate-300/80 leading-snug mt-0.5">
                  Multi-bin tracking, reorder alerts &amp; transfers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-[#11311c] border border-[#22c55e]/40 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#3cd32d]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Customers &amp; Credit</h4>
                <p className="text-[11px] text-slate-300/80 leading-snug mt-0.5">
                  Customer credit limits, balances &amp; ledgers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-[#11311c] border border-[#22c55e]/40 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-[#3cd32d]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Executive Reports</h4>
                <p className="text-[11px] text-slate-300/80 leading-snug mt-0.5">
                  Real-time margins, sales profit &amp; cash flows
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
          <span>Keerthi Hardwares Ltd. · Enterprise Systems</span>
          <span className="font-mono text-emerald-400">Frappe / ERPNext v16 Active</span>
        </div>
      </div>

      {/* Desktop Right: Professional Authentication Station */}
      <div className="w-5/12 bg-white text-slate-900 p-10 lg:p-12 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-950 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 text-sm mt-1">
                Sign in to your Keerthi ERP workstation to access your business.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Accounts for Development & Testing */}
          <div className="mb-5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Role Autofill
              </span>
              <span className="text-[10px] text-slate-400">One-click testing</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('system_admin')}
                className="px-2 py-2 bg-white border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('order_biller')}
                className="px-2 py-2 bg-white border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer text-center"
              >
                Order Biller
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('accountant')}
                className="px-2 py-2 bg-white border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer text-center"
              >
                Accountant
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username or Official Email
              </label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-4 pr-2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. administrator or billing@keerthi.com"
                  disabled={isLoading}
                  className="w-full py-3.5 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-4 pr-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your ERP password"
                  disabled={isLoading}
                  className="w-full py-3.5 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert(
                    'Please contact your Keerthi ERP Administrator at https://erp.keerthigroup.co.in to reset your credentials.'
                  )
                }
                className="font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button (Deep forest green #0e3b20) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-[#0e3b20] hover:bg-[#092b17] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Authenticating with ERPNext...</span>
                </>
              ) : (
                <>
                  <span>Login to ERP</span>
                  <ArrowRight className="w-5 h-5 text-white" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Keerthi Hardwares • ERPNext Powered</span>
          {onExploreAsGuest && (
            <button
              type="button"
              onClick={onExploreAsGuest}
              className="font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore as Guest</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#0b0d10] text-white flex flex-col justify-center items-center p-0 md:p-6 lg:p-8 selection:bg-emerald-500 selection:text-black font-sans">
      {/* Mobile Phone (< 768px): Splash Screen + Login Screen matching uploaded screenshot */}
      <div className="w-full flex md:hidden items-center justify-center">
        {renderPhoneView()}
      </div>

      {/* Tablet (768px - 1023px): Touch-friendly tablet portal card */}
      <div className="w-full hidden md:flex lg:hidden items-center justify-center">
        {renderTabletView()}
      </div>

      {/* Desktop (>= 1024px): Full-screen enterprise ERP split-screen */}
      <div className="w-full hidden lg:flex items-center justify-center">
        {renderDesktopView()}
      </div>
    </div>
  );
}
