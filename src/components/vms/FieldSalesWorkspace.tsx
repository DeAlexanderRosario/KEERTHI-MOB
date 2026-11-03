import React, { useState, useEffect } from 'react';
import {
  Store,
  Camera,
  MapPin,
  Phone,
  Plus,
  Clock,
  IndianRupee,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Search,
  ExternalLink,
  FileText,
  UserCheck,
  ChevronRight,
  UploadCloud,
  X,
  CreditCard,
  RefreshCw,
  Navigation,
  ShieldCheck,
  FileCheck,
  Building,
  Briefcase,
  Mail,
  Layers,
  Landmark as LandmarkIcon,
  Tag,
} from 'lucide-react';
import {
  vmsService,
  CustomerOnboardingData,
  ShopVisitData,
  PaymentCollectionData,
  KycDocument,
} from '../../services/vmsService';
import { authService } from '../../services/authService';
import { VisitTimelineView } from './VisitTimelineView';
import { InteractiveMapPin } from './InteractiveMapPin';
import { KycDocumentUploader } from './KycDocumentUploader';
import { MultiProductOrderModal } from './MultiProductOrderModal';
import { GeofencedVisitModal } from './GeofencedVisitModal';
import { ProductPriceManagerModal } from './ProductPriceManagerModal';

async function optimizeOnboardingPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot process the selected image.');

    // Normalize camera formats (including HEIC when the browser can decode it)
    // to JPEG before JSON transport; the original file size is not constrained.
    let blob: Blob | null = null;
    for (const maxDimension of [1920, 1600, 1280, 960]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.72, 0.60, 0.48]) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= 4 * 1024 * 1024) break;
      }
      if (blob && blob.size <= 4 * 1024 * 1024) break;
    }
    if (!blob || blob.size > 4 * 1024 * 1024) throw new Error('This image could not be optimized enough for a reliable upload. Retake it in standard photo quality or choose another image.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the prepared image.'));
      reader.onerror = () => reject(new Error('Could not read the prepared image.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}

interface FieldSalesWorkspaceProps {
  onOpenOnboardingRequest?: (requestName: string) => void;
}

export function FieldSalesWorkspace({ onOpenOnboardingRequest }: FieldSalesWorkspaceProps) {
  const user = authService.getUser();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'shops' | 'orders' | 'collections' | 'kyc'>('dashboard');
  const [timelineShopName, setTimelineShopName] = useState<string>('');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showVisitModal, setShowVisitModal] = useState<boolean>(false);
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [showMultiOrderModal, setShowMultiOrderModal] = useState<boolean>(false);
  const [showGeofencedVisitModal, setShowGeofencedVisitModal] = useState<boolean>(false);
  const [selectedShopForAction, setSelectedShopForAction] = useState<string>('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Real Data states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('All');
  const [availableTerritories, setAvailableTerritories] = useState<Array<{ name: string; territory_name: string }>>([]);
  const [realCustomers, setRealCustomers] = useState<any[]>([]);
  const [fieldSalesOptions, setFieldSalesOptions] = useState<any>({
    territories: [], customer_groups: [], selling_price_lists: [], customer_types: [],
    gst_categories: [], payment_modes: [], visit_purposes: [], interest_levels: [],
    defaults: { customer_group: '', selling_price_list: '', customer_type: '' },
  });
  const [realItems, setRealItems] = useState<any[]>([]);
  const [onboardedShops, setOnboardedShops] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Shop Form State (With GPS, Landmark, KYC & Duplicate Prevention)
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [territory, setTerritory] = useState<string>('');
  const [mobileNo, setMobileNo] = useState<string>('');
  const [gstIn, setGstIn] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [remarks, setRemarks] = useState<string>('');
  const [shopPhotoData, setShopPhotoData] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(9.9816);
  const [longitude, setLongitude] = useState<number>(76.2999);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>(undefined);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldOptionsError, setFieldOptionsError] = useState<string | null>(null);
  const [kycFilter, setKycFilter] = useState<'All' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected'>('All');
  const [kycViewSection, setKycViewSection] = useState<'documents' | 'exceptions'>('documents');

  // Extended Hardware Shop Profile & Commercial States
  const [alternateMobile, setAlternateMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [customerGroup, setCustomerGroup] = useState<string>('');
  const [customerType, setCustomerType] = useState<string>('');
  const [pan, setPan] = useState<string>('');
  const [gstCategory, setGstCategory] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [creditDays, setCreditDays] = useState<number>(0);
  const [priceList, setPriceList] = useState<string>('');
  const [estimatedMonthlyTurnover, setEstimatedMonthlyTurnover] = useState<string>('');
  const [brandsStocked, setBrandsStocked] = useState<string>('Supreme Pipes, ACC Cement, Tata Tiscon');
  const [weeklyOffDay, setWeeklyOffDay] = useState<string>('');
  const [tradeLicenceNo, setTradeLicenceNo] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [onboardFormStep, setOnboardFormStep] = useState<'general' | 'address' | 'gps' | 'tax' | 'credit'>('general');

  // Visit & Order Form State
  const [visitPurpose, setVisitPurpose] = useState<string>('');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [orderItemCode, setOrderItemCode] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(1);

  // Payment Collection Form State
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMode, setCollectMode] = useState<string>('');
  const [collectRef, setCollectRef] = useState<string>('');

  // Product Pricing Manager State
  const [showPriceManagerModal, setShowPriceManagerModal] = useState<boolean>(false);
  const [priceManagerItemCode, setPriceManagerItemCode] = useState<string | undefined>(undefined);

  const loadData = async () => {
    const [customerResult, visitResult, collectionResult, orderResult, onboardingResult, optionsResult] = await Promise.allSettled([
      vmsService.getRealCustomers(true),
      vmsService.getMyShopVisits(),
      vmsService.getMyCollections(),
      vmsService.getMySalesOrders(),
      vmsService.getMyOnboardingRequests(),
      vmsService.getFieldSalesOptions(),
    ]);
    if (customerResult.status === 'fulfilled') setRealCustomers(customerResult.value);
    else console.warn('Assigned VMS shops fetch:', customerResult.reason);
    if (visitResult.status === 'fulfilled') setVisits(visitResult.value);
    else console.warn('Shop visits fetch:', visitResult.reason);
    if (collectionResult.status === 'fulfilled') setCollections(collectionResult.value);
    else console.warn('Collections fetch:', collectionResult.reason);
    if (orderResult.status === 'fulfilled') setOrders(orderResult.value);
    else console.warn('Sales orders fetch:', orderResult.reason);
    if (onboardingResult.status === 'fulfilled') setOnboardedShops(onboardingResult.value);
    else console.warn('Onboarding requests fetch:', onboardingResult.reason);
    if (optionsResult.status === 'fulfilled') {
      const options = optionsResult.value;
      setFieldOptionsError(null);
      setFieldSalesOptions(options);
      setAvailableTerritories(options.territories);
      if (!options.territories.some((entry) => entry.name === territory)) setTerritory(options.territories[0]?.name || '');
      setCustomerGroup((current) => options.customer_groups.some((entry) => entry.name === current) ? current : options.defaults.customer_group || '');
      setCustomerType((current) => options.customer_types.includes(current) ? current : options.defaults.customer_type || '');
      setPriceList((current) => options.selling_price_lists.some((entry) => entry.name === current) ? current : options.defaults.selling_price_list || '');
      setGstCategory((current) => options.gst_categories.includes(current) ? current : '');
      setCollectMode((current) => options.payment_modes.some((entry) => entry.name === current) ? current : options.payment_modes[0]?.name || '');
      setVisitPurpose((current) => options.visit_purposes.includes(current) ? current : options.visit_purposes[0] || '');
    } else {
      setAvailableTerritories([]);
      setFieldOptionsError(optionsResult.reason instanceof Error ? optionsResult.reason.message : 'ERPNext options could not be loaded.');
      console.warn('Field Sales options fetch:', optionsResult.reason);
    }

    try {
      const custs = customerResult.status === 'fulfilled' ? customerResult.value : [];
      if (custs.length > 0 && !selectedShopForAction) {
        setSelectedShopForAction(custs[0].customer_name || custs[0].name);
      }
    } catch (e) {
      console.warn('Real customers fetch:', e);
    }

    try {
      const itms = await vmsService.getRealItems();
      setRealItems(itms);
      if (itms.length > 0 && itms[0].item_code) {
        setOrderItemCode(itms[0].item_code);
      }
    } catch (e) {
      console.warn('Real items fetch:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Real ERPNext Customer mapping
  const allShops = realCustomers.map((s) => ({
    customer_name: s.customer_name || s.name,
    owner_name: s.customer_name || s.name,
    territory: s.territory || 'Assigned Territory',
    mobile_no: s.mobile_no || 'Contact on file',
    address: s.primary_address || s.address || s.territory || 'Address on file',
    status: s.status || (s.disabled ? 'Disabled' : 'Active'),
    credit_limit: s.credit_limits?.[0]?.credit_limit || s.proposed_credit_limit || 0,
    outstanding: s.outstanding_amount || 0,
    photo: s.image || vmsService.getShopPhoto(s.customer_name || s.name),
  }));

  const filteredShops = allShops.filter((s) => {
    const matchesSearch =
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTerritory = selectedTerritory === 'All' || s.territory === selectedTerritory;
    return matchesSearch && matchesTerritory;
  });

  // Debounced duplicate detection during onboarding
  useEffect(() => {
    if (!mobileNo && !gstIn && !shopName) {
      setDuplicateWarnings([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      const res = await vmsService.checkShopDuplicates(mobileNo, gstIn, shopName);
      setDuplicateWarnings(res.reasons);
      setIsCheckingDuplicates(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [mobileNo, gstIn, shopName]);

  // Handle Photo Capture / Selection
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setShopPhotoData(await optimizeOnboardingPhoto(file));
      } catch (error: any) {
        alert(error?.message || 'Could not prepare this image. Try another photo.');
      } finally {
        e.target.value = '';
      }
    }
  };

  // Submit Shop Onboarding with GPS, Landmark & KYC
  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !mobileNo.trim()) {
      alert('Shop Name and Mobile Number are required.');
      return;
    }
    if (fieldOptionsError) {
      alert(`ERPNext setup values could not be loaded. Refresh the options and try again. ${fieldOptionsError}`);
      return;
    }
    if (!territory || !availableTerritories.some((entry) => entry.name === territory) ||
        !fieldSalesOptions.customer_groups.some((entry: any) => entry.name === customerGroup) ||
        !fieldSalesOptions.selling_price_lists.some((entry: any) => entry.name === priceList) ||
        !fieldSalesOptions.customer_types.includes(customerType)) {
      alert('Choose a valid Territory, Customer Group, Customer Type, and selling Price List from ERPNext before submitting.');
      return;
    }

    if (duplicateWarnings.length > 0) {
      const proceed = window.confirm(
        `Potential duplicate warning:\n${duplicateWarnings.join('\n')}\n\nDo you want to continue registration anyway?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      await vmsService.submitOnboardingRequest({
        customer_name: shopName.trim(),
        owner_name: ownerName.trim() || shopName.trim(),
        territory,
        mobile_no: mobileNo.trim(),
        alternate_mobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        customer_group: customerGroup,
        customer_type: customerType,
        pan: pan.trim().toUpperCase() || undefined,
        gst_in: gstIn.trim().toUpperCase() || undefined,
        gst_category: gstCategory,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        landmark: landmark.trim() || undefined,
        proposed_credit_limit: creditLimit,
        credit_days: creditDays,
        price_list: priceList,
        estimated_monthly_turnover: estimatedMonthlyTurnover,
        brands_stocked: brandsStocked,
        weekly_off_day: weeklyOffDay,
        trade_licence_no: tradeLicenceNo.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        account_no: accountNo.trim() || undefined,
        ifsc_code: ifscCode.trim().toUpperCase() || undefined,
        remarks: remarks.trim() || undefined,
        shop_photo_url: shopPhotoData || undefined,
        latitude,
        longitude,
        gps_accuracy: gpsAccuracy,
        kyc_documents: kycDocuments,
      });

      showToast(
        `Shop "${shopName}" onboarded with GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) & complete profile!`
      );
      setShowOnboardModal(false);
      // Reset form
      setShopName('');
      setOwnerName('');
      setMobileNo('');
      setAlternateMobile('');
      setEmail('');
      setGstIn('');
      setPan('');
      setAddress('');
      setCity('Kochi');
      setPincode('');
      setLandmark('');
      setTradeLicenceNo('');
      setBankName('');
      setAccountNo('');
      setIfscCode('');
      setRemarks('');
      setShopPhotoData('');
      setKycDocuments([]);
      setDuplicateWarnings([]);
      loadData();
    } catch (err: any) {
      alert('Failed to submit onboarding request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Shop Visit & Order
  const handleSubmitVisitAndOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForAction) {
      alert('Please select a customer shop.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Log the visit
      await vmsService.createShopVisit({
        customer: selectedShopForAction,
        purpose: visitPurpose,
        notes: visitNotes,
        follow_up_date: followUpDate || undefined,
        items: [
          {
            item_code: orderItemCode,
            order_qty: orderQty,
            customer_interest: 'High',
          },
        ],
      });

      // 2. If order qty > 0, generate Sales Order (server calculates authoritative price list rate)
      if (orderQty > 0) {
        await vmsService.createSalesOrder(selectedShopForAction, [
          { item_code: orderItemCode, qty: orderQty },
        ]);
      }

      showToast(`Visit & Order recorded for ${selectedShopForAction}!`);
      setShowVisitModal(false);
      setVisitNotes('');
      loadData();
    } catch (err: any) {
      alert('Error recording visit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Payment Collection
  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForAction || collectAmount <= 0) {
      alert('Valid shop and amount are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await vmsService.createPaymentCollection({
        customer: selectedShopForAction,
        amount: collectAmount,
        mode_of_payment: collectMode,
        transaction_reference: collectRef.trim() || undefined,
      });

      showToast(`Payment of ₹${collectAmount.toLocaleString('en-IN')} recorded for ${selectedShopForAction}!`);
      setShowCollectionModal(false);
      setCollectRef('');
      loadData();
    } catch (err: any) {
      alert('Error recording collection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCollectedToday = collections.reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0B4025] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#20D52E]/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#20D52E] shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Top Banner & Sales Agent Status */}
      <div className="bg-[#090B0A] text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-[#20D52E]/10 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#20D52E]/20 text-[#20D52E] border border-[#20D52E]/30">
                <Store className="w-3.5 h-3.5" /> Field Sales Agent Portal
              </span>
              <span className="text-slate-400 text-xs">VMS Field Ops</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Hardware Field Sales & Shop Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Onboard retail shops, record storefront photos, capture demand, and collect payments on-site.
            </p>
          </div>

          {/* Quick Action Button to Register Shop */}
          <button
            onClick={() => setShowOnboardModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#20D52E] text-[#090B0A] font-bold text-sm hover:bg-[#1db829] active:scale-95 transition-all shadow-md shadow-[#20D52E]/20 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>+ Onboard New Shop</span>
          </button>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Total Active Shops</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{allShops.length}</span>
              <span className="text-[10px] text-[#20D52E]">Registered</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Today's Visits</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{visits.length}</span>
              <span className="text-[10px] text-amber-400">Logged</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Orders Captured</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{orders.length}</span>
              <span className="text-[10px] text-emerald-400">Booked</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Collections Captured</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-[#20D52E]">
                ₹{totalCollectedToday.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Subtabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Visits & Quick Actions</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4 text-[#20D52E]" />
          <span>Visit Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'shops'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Shops Directory ({allShops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Captured Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'collections'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Payment Collections ({collections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'kyc'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#20D52E]" />
          <span>KYC & Geofence Audits</span>
        </button>
      </div>

      {/* TAB: VISIT TIMELINE VISUALIZATION (SHOP LIFECYCLE) */}
      {activeTab === 'timeline' && (
        <VisitTimelineView
          initialShopName={timelineShopName || (allShops[0]?.customer_name ?? '')}
          onOpenOnboardShop={() => setShowOnboardModal(true)}
          onOpenOrderModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowMultiOrderModal(true);
          }}
          onOpenCollectionModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowCollectionModal(true);
          }}
          onOpenVisitModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowGeofencedVisitModal(true);
          }}
        />
      )}

      {/* TAB 1: VISITS & QUICK ACTIONS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Quick Action Trigger Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setSelectedShopForAction(allShops[0]?.customer_name || '');
                setShowGeofencedVisitModal(true);
              }}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Navigation className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-emerald-700">
                  Log Geofenced Visit
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  GPS lock, 200m radius validation & discussion record.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedShopForAction(allShops[0]?.customer_name || '');
                setShowMultiOrderModal(true);
              }}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-blue-700">
                  Multi-Product Order
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Live stock check, price tiers, and 18% GST order builder.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedShopForAction(allShops[0]?.customer_name || '');
                setShowCollectionModal(true);
              }}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5 text-[#20D52E]" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-green-700">
                  Collect Payment
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Record lump sum or invoice-linked cash/UPI payments.
                </span>
              </div>
            </button>

            <button
              onClick={() => setShowOnboardModal(true)}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-lime-50 text-lime-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-lime-800">
                  Onboard Shop + GPS
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Storefront photo, map pin & KYC verification upload.
                </span>
              </div>
            </button>
          </div>

          {/* Today's Logged Visits Feed */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Today's Logged Shop Visits</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">{visits.length} recorded</span>
            </div>

            {visits.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No shop visits logged yet today</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start your field rounds by visiting assigned hardware stores and recording notes.
                </p>
                <button
                  onClick={() => {
                    setSelectedShopForAction(allShops[0]?.customer_name || '');
                    setShowVisitModal(true);
                  }}
                  className="mt-3 px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Log First Visit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v, i) => (
                  <div
                    key={v.name || i}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        #{i + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{v.customer}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{v.purpose}</span>
                          <span>•</span>
                          <span>{new Date(v.visit_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {v.notes && <p className="text-xs text-slate-600 mt-1 italic">"{v.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {v.status || 'Completed'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedShopForAction(v.customer);
                          setShowCollectionModal(true);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 bg-[#20D52E] text-slate-900 rounded-md hover:bg-[#1db829]"
                      >
                        Collect ₹
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHOPS DIRECTORY */}
      {activeTab === 'shops' && (
        <div className="space-y-4">
          {onboardedShops.length > 0 && (
            <section className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your onboarding requests</h3>
                  <p className="text-xs text-slate-500">Approved requests become VMS Shop Customers and appear in the directory.</p>
                </div>
                <span className="text-xs font-bold rounded-full bg-amber-50 text-amber-800 px-2.5 py-1">{onboardedShops.filter((request) => !request.created_customer).length} awaiting approval</span>
              </div>
              <div className="divide-y divide-slate-100">
                {onboardedShops.slice(0, 6).map((request) => (
                  <div key={request.name} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{request.shop_name}</div>
                      <div className="text-xs text-slate-500">{request.mobile_no} · {request.territory}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-700">{request.status}</div>
                      {request.created_customer && <div className="text-[11px] text-emerald-700">Customer {request.created_customer}</div>}
                      {onOpenOnboardingRequest && request.name && (
                        <button
                          type="button"
                          onClick={() => onOpenOnboardingRequest(String(request.name))}
                          className="mt-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          Open request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop name, proprietor, or locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20D52E]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTerritory}
                onChange={(e) => setSelectedTerritory(e.target.value)}
                className="text-xs sm:text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#20D52E]"
              >
                <option value="All">All Territories</option>
                {availableTerritories.map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.territory_name || entry.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowOnboardModal(true)}
                className="px-3.5 py-2 bg-[#20D52E] text-slate-900 font-bold text-xs rounded-lg hover:bg-[#1db829] whitespace-nowrap flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Shop
              </button>
            </div>
          </div>

          {/* Shops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShops.map((shop, idx) => (
              <div
                key={shop.customer_name + idx}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Storefront Photo Thumbnail with Click-to-Zoom */}
                    <div className="relative group shrink-0">
                      <div
                        onClick={() => shop.photo && setPreviewPhotoUrl(shop.photo)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-xs"
                      >
                        {shop.photo ? (
                          <img
                            src={shop.photo}
                            alt={shop.customer_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                            <Store className="w-6 h-6" />
                            <span className="text-[9px] mt-0.5">No Photo</span>
                          </div>
                        )}
                      </div>
                      {shop.photo && (
                        <span className="absolute -bottom-1 -right-1 bg-[#090B0A] text-white p-1 rounded-full text-[9px] shadow-xs">
                          <Camera className="w-2.5 h-2.5 text-[#20D52E]" />
                        </span>
                      )}
                    </div>

                    {/* Shop Meta Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{shop.customer_name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                          {shop.status}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Proprietor: <span className="text-slate-800">{shop.owner_name}</span>
                      </p>

                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{shop.address || shop.territory}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <a
                          href={`tel:${shop.mobile_no}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{shop.mobile_no}</span>
                        </a>

                        {(() => {
                          const gps = vmsService.getShopGps(shop.customer_name);
                          if (!gps) return null;
                          return (
                            <a
                              href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                              title={`Pinned at ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)} (±${gps.gps_accuracy || 15}m)`}
                            >
                              <Navigation className="w-2.5 h-2.5 text-blue-600" />
                              <span>GPS Pinned</span>
                            </a>
                          );
                        })()}

                        {(() => {
                          const kycDocs = vmsService.getKycDocuments(shop.customer_name);
                          if (kycDocs.length === 0) return null;
                          const hasRejected = kycDocs.some((d) => d.verification_status === 'Rejected');
                          const allVerified = kycDocs.every((d) => d.verification_status === 'Verified');
                          const isUnderReview = kycDocs.some((d) => d.verification_status === 'Under Review');
                          const status = hasRejected
                            ? 'Rejected'
                            : allVerified
                            ? 'Verified'
                            : isUnderReview
                            ? 'Review'
                            : 'Pending';
                          const colorClass =
                            status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200';
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${colorClass}`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>KYC: {status}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Balance Details */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Credit Limit</span>
                      <span className="font-semibold text-slate-700">
                        ₹{(shop.credit_limit || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Ledger Outstanding</span>
                      <span className={`font-bold ${shop.outstanding > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        ₹{(shop.outstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons on Shop Card */}
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setTimelineShopName(shop.customer_name);
                      setActiveTab('timeline');
                    }}
                    className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1"
                    title="View Lifecycle Timeline"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#20D52E]" />
                    <span className="hidden sm:inline">Timeline</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedShopForAction(shop.customer_name);
                      setShowGeofencedVisitModal(true);
                    }}
                    className="py-1.5 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 border border-emerald-200"
                    title="Check-In within 200m Geofence"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Visit</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedShopForAction(shop.customer_name);
                      setShowMultiOrderModal(true);
                    }}
                    className="py-1.5 px-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 border border-blue-200"
                    title="Dynamic Multi-Item Order"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Order</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedShopForAction(shop.customer_name);
                      setShowCollectionModal(true);
                    }}
                    className="py-1.5 px-1 bg-[#20D52E] hover:bg-[#1db829] text-slate-900 rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <IndianRupee className="w-3.5 h-3.5 text-slate-900" />
                    <span>Collect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CAPTURED ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Sales Orders Captured by Field Agents</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{orders.length} orders</span>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No sales orders captured yet. Visit a shop and take an order.
              </p>
            ) : (
              orders.map((ord, idx) => (
                <div
                  key={ord.name || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">{ord.name}</span>
                    <h4 className="text-sm font-bold text-slate-800">{ord.customer}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Delivery Date: {ord.delivery_date} • {ord.items?.length || 1} line item(s)
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {ord.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Field Payment Collections Log</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{collections.length} collections</span>
          </div>

          <div className="space-y-3">
            {collections.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No payment collections recorded yet today.
              </p>
            ) : (
              collections.map((col, idx) => (
                <div
                  key={col.name || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{col.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {col.mode_of_payment}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{col.customer}</h4>
                    {col.transaction_reference && (
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        Ref: {col.transaction_reference}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold text-emerald-700">
                      ₹{col.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">{col.collection_date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: KYC IDENTITY VERIFICATION & GEOFENCE AUDITS */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          {/* Header & Sub-Navigation */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#20D52E]" />
                  <span>KYC Identity Proofs & Geofence Exceptions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verification console for shop documents (PAN, GSTIN, Masked Aadhaar) and agent GPS check-in radius compliance.
                </p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold self-start sm:self-auto">
                <button
                  onClick={() => setKycViewSection('documents')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    kycViewSection === 'documents'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  KYC Documents
                </button>
                <button
                  onClick={() => setKycViewSection('exceptions')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    kycViewSection === 'exceptions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Geofence Exceptions</span>
                  {visits.filter((v) => v.geofence_status === 'Exception Outside Geofence' || (v.distance_from_shop_meters && v.distance_from_shop_meters > 200)).length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              {(() => {
                const allKycDocs = allShops.flatMap((s) => vmsService.getKycDocuments(s.customer_name));
                const verifiedCount = allKycDocs.filter((d) => d.verification_status === 'Verified').length;
                const pendingCount = allKycDocs.filter((d) => d.verification_status === 'Pending' || d.verification_status === 'Under Review').length;
                const exceptionsCount = visits.filter(
                  (v) => v.geofence_status === 'Exception Outside Geofence' || (v.distance_from_shop_meters && v.distance_from_shop_meters > 200)
                ).length;

                return (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-500 block">Total KYC Uploads</span>
                      <span className="text-lg font-bold text-slate-900 mt-0.5 block">{allKycDocs.length}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                      <span className="text-[11px] font-medium text-emerald-700 block">Verified Documents</span>
                      <span className="text-lg font-bold text-emerald-800 mt-0.5 block">{verifiedCount}</span>
                    </div>
                    <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                      <span className="text-[11px] font-medium text-amber-700 block">Pending / In Review</span>
                      <span className="text-lg font-bold text-amber-800 mt-0.5 block">{pendingCount}</span>
                    </div>
                    <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200">
                      <span className="text-[11px] font-medium text-rose-700 block">Geofence Flags (&gt;200m)</span>
                      <span className="text-lg font-bold text-rose-800 mt-0.5 block">{exceptionsCount}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* SECTION 1: KYC DOCUMENTS LIST */}
          {kycViewSection === 'documents' && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                {(['All', 'Pending', 'Under Review', 'Verified', 'Rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setKycFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                      kycFilter === filter
                        ? 'bg-[#090B0A] text-white border-[#090B0A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Shops KYC Cards */}
              {(() => {
                const shopsWithDocs = allShops
                  .map((shop) => {
                    const docs = vmsService.getKycDocuments(shop.customer_name);
                    const gps = vmsService.getShopGps(shop.customer_name);
                    const filteredDocs =
                      kycFilter === 'All' ? docs : docs.filter((d) => d.verification_status === kycFilter);
                    return { ...shop, docs: filteredDocs, allDocsCount: docs.length, gps };
                  })
                  .filter((s) => s.docs.length > 0 || (kycFilter === 'All' && s.gps));

                if (shopsWithDocs.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                      <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No KYC documents matching "{kycFilter}"</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        When field agents onboard hardware shops with PAN, GST, or identity cards, they appear here for manager review and compliance sign-off.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {shopsWithDocs.map((shop) => (
                      <div
                        key={shop.customer_name}
                        className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{shop.customer_name}</h4>
                              <span className="text-[11px] font-medium text-slate-500">
                                ({shop.owner_name} • {shop.territory})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>Mobile: {shop.mobile_no}</span>
                              {shop.gps && (
                                <a
                                  href={`https://www.google.com/maps?q=${shop.gps.latitude},${shop.gps.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-[11px]"
                                >
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span>
                                    {shop.gps.latitude.toFixed(4)}, {shop.gps.longitude.toFixed(4)} (±{shop.gps.gps_accuracy || 15}m)
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
                            {shop.docs.length} Document(s)
                          </span>
                        </div>

                        {/* Documents Grid for this Shop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {shop.docs.map((doc) => (
                            <div
                              key={doc.id || doc.document_type}
                              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-xs font-bold text-slate-900 block">
                                      {doc.document_type}
                                    </span>
                                    {doc.document_number && (
                                      <span className="text-xs font-mono font-semibold text-slate-600 block mt-0.5">
                                        ID: {doc.document_number}
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      doc.verification_status === 'Verified'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : doc.verification_status === 'Rejected'
                                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {doc.verification_status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                  <span>Uploaded at {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                  {doc.reviewed_by && (
                                    <>
                                      <span>•</span>
                                      <span>Reviewed by {doc.reviewed_by}</span>
                                    </>
                                  )}
                                </div>

                                {/* Front & Back Images */}
                                <div className="flex items-center gap-2 mt-3">
                                  {doc.front_photo_url ? (
                                    <div
                                      onClick={() => setPreviewPhotoUrl(doc.front_photo_url)}
                                      className="w-20 h-14 rounded bg-slate-200 border border-slate-300 overflow-hidden cursor-pointer group relative"
                                    >
                                      <img
                                        src={doc.front_photo_url}
                                        alt="Front"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                                        Front
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="w-20 h-14 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                      No Front
                                    </div>
                                  )}

                                  {doc.back_photo_url ? (
                                    <div
                                      onClick={() => setPreviewPhotoUrl(doc.back_photo_url || null)}
                                      className="w-20 h-14 rounded bg-slate-200 border border-slate-300 overflow-hidden cursor-pointer group relative"
                                    >
                                      <img
                                        src={doc.back_photo_url}
                                        alt="Back"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                                        Back
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="w-20 h-14 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                      No Back
                                    </div>
                                  )}
                                </div>

                                {doc.reviewer_remarks && (
                                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                                    <span className="font-semibold">Reviewer Note: </span>
                                    <span>{doc.reviewer_remarks}</span>
                                  </div>
                                )}
                              </div>

                              {/* Manager Decision Buttons */}
                              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    vmsService.updateKycStatus(
                                      shop.customer_name,
                                      doc.id || doc.document_type,
                                      'Verified',
                                      undefined,
                                      user?.fullName || user?.user || 'Field Sales Manager'
                                    );
                                    showToast(`${doc.document_type} marked as Verified!`);
                                    loadData();
                                  }}
                                  className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded text-center transition-colors flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Verify</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    vmsService.updateKycStatus(
                                      shop.customer_name,
                                      doc.id || doc.document_type,
                                      'Under Review',
                                      undefined,
                                      user?.fullName || user?.user || 'Field Sales Manager'
                                    );
                                    showToast(`${doc.document_type} set to Under Review`);
                                    loadData();
                                  }}
                                  className="py-1 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-semibold rounded text-center transition-colors"
                                >
                                  Review
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = prompt('Please enter rejection reason:');
                                    if (reason) {
                                      vmsService.updateKycStatus(
                                        shop.customer_name,
                                        doc.id || doc.document_type,
                                        'Rejected',
                                        reason,
                                        user?.fullName || user?.user || 'Field Sales Manager'
                                      );
                                      showToast(`${doc.document_type} Rejected`);
                                      loadData();
                                    }
                                  }}
                                  className="py-1 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold rounded text-center transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SECTION 2: GEOFENCE EXCEPTIONS AUDIT */}
          {kycViewSection === 'exceptions' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-rose-600" />
                    <span>Geofence Exceptions Log (&gt;200m Check-in Radius)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visits where GPS check-in distance exceeded the mandatory 200m shop radius, requiring supervisor justification.
                  </p>
                </div>
              </div>

              {(() => {
                const exceptionVisits = visits.filter(
                  (v) =>
                    v.geofence_status === 'Exception Outside Geofence' ||
                    (v.distance_from_shop_meters && v.distance_from_shop_meters > 200)
                );

                if (exceptionVisits.length === 0) {
                  return (
                    <div className="text-center py-10 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-emerald-900">Zero Geofence Violations</p>
                      <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1">
                        All field sales visits logged today took place within the strict 200-meter shop perimeter.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {exceptionVisits.map((v, i) => (
                      <div
                        key={v.name || i}
                        className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              !
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-slate-900">{v.customer}</h5>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                  {v.distance_from_shop_meters
                                    ? `${Math.round(v.distance_from_shop_meters)}m from Shop (>200m limit)`
                                    : 'Outside Geofence'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Purpose: {v.purpose} • Logged at: {new Date(v.visit_datetime).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-mono font-semibold text-slate-600">
                            {v.sales_person || 'Field Agent'}
                          </span>
                        </div>

                        {/* Agent's Exception Justification */}
                        <div className="mt-2 p-3 bg-white rounded-lg border border-rose-200 text-xs">
                          <span className="font-bold text-rose-800 block mb-0.5">Agent Exception Justification:</span>
                          <p className="text-slate-700 italic">
                            "{v.geofence_exception_reason || 'GPS drift / Met proprietor at warehouse godown.'}"
                          </p>
                        </div>

                        {/* Coordinates comparison */}
                        {v.checkin_latitude && (
                          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono mt-1">
                            <span>
                              Check-In GPS: {v.checkin_latitude.toFixed(4)}, {v.checkin_longitude.toFixed(4)} (±{v.checkin_gps_accuracy || 15}m)
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${v.checkin_latitude},${v.checkin_longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1 font-sans font-medium"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Check-In on Maps</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ONBOARD NEW HARDWARE SHOP (COMPREHENSIVE MULTI-SECTION PROFILE) */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-[#0B4025]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Onboard New Hardware Shop
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive enterprise profile for ERPNext customer creation & credit allocation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Section Selector Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl my-3 overflow-x-auto text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setOnboardFormStep('general')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  onboardFormStep === 'general'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Shop Info</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardFormStep('address')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  onboardFormStep === 'address'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Contact & Address</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardFormStep('gps')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  onboardFormStep === 'gps'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>3. GPS & Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardFormStep('tax')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  onboardFormStep === 'tax'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>4. Tax & KYC</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardFormStep('credit')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  onboardFormStep === 'credit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5 text-[#20D52E]" />
                <span>5. Credit & Banking</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitOnboarding} className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs sm:text-sm">
              {(fieldOptionsError || !availableTerritories.length || !fieldSalesOptions.customer_groups.length || !fieldSalesOptions.selling_price_lists.length || !fieldSalesOptions.customer_types.length) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                  <p className="font-semibold">Shop setup choices are loaded from ERPNext. Onboarding is blocked until required live options are available.</p>
                  {fieldOptionsError && <p>{fieldOptionsError}</p>}
                  {!availableTerritories.length && <p>No leaf Territory is assigned to this user. Ask an ERPNext admin to add a Territory User Permission for the field sales account; the selector is intentionally limited to assigned territories.</p>}
                  {!fieldSalesOptions.customer_groups.length && <p>No leaf Customer Groups are configured.</p>}
                  {!fieldSalesOptions.selling_price_lists.length && <p>No enabled selling Price Lists are configured.</p>}
                  {!fieldSalesOptions.customer_types.length && <p>Customer Type options are missing from ERPNext Customer metadata.</p>}
                  <button type="button" onClick={() => void loadData()} className="font-bold underline">Refresh ERPNext options</button>
                </div>
              )}
              {/* Duplicate Warning Banner */}
              {duplicateWarnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Duplicate Shop Warning</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                    {duplicateWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* STEP 1: SHOP INFO & BUSINESS CONSTITUTION */}
              {onboardFormStep === 'general' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-slate-500">
                      <Building className="w-4 h-4 text-emerald-700" />
                      <span>Enterprise & Business Information</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Shop / Enterprise Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sri Venkateswara Hardware, Sanitary & Electricals"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            Proprietor / Key Contact Person <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rajesh Kumar Nair"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Customer Group / Category</label>
                          <select
                            value={customerGroup}
                            onChange={(e) => setCustomerGroup(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                          >
                            <option value="">Select Customer Group</option>
                            {fieldSalesOptions.customer_groups.map((entry: any) => (
                              <option key={entry.name} value={entry.name}>{entry.customer_group_name || entry.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Business Constitution</label>
                          <div className="grid grid-cols-2 gap-2">
                            {fieldSalesOptions.customer_types.map((type: string) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setCustomerType(type)}
                                className={`py-1.5 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
                                  customerType === type
                                    ? 'bg-[#090B0A] text-white border-[#090B0A]'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Trade Licence / Shops Reg No</label>
                          <input
                            type="text"
                            placeholder="e.g. TL-EKM-2024-88910"
                            value={tradeLicenceNo}
                            onChange={(e) => setTradeLicenceNo(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('address')}
                      className="px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span>Next: Contact & Address</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTACTS & PHYSICAL ADDRESS */}
              {onboardFormStep === 'address' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <Phone className="w-4 h-4 text-blue-700" />
                      <span>Contact Channels</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Primary Mobile <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98470 12345"
                          value={mobileNo}
                          onChange={(e) => setMobileNo(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Alternate / WhatsApp Phone</label>
                        <input
                          type="tel"
                          placeholder="+91 94471 67890"
                          value={alternateMobile}
                          onChange={(e) => setAlternateMobile(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="accounts@venkateswara.in"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <MapPin className="w-4 h-4 text-rose-700" />
                      <span>Physical Delivery & Billing Address</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Shop Street Address / Building <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Building XII/450, Market Junction Road"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Prominent Landmark</label>
                        <input
                          type="text"
                          placeholder="e.g. Opposite KSRTC Bus Depot / Near Indian Oil Pump"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">City / Town</label>
                        <input
                          type="text"
                          placeholder="Kochi"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">District</label>
                        <input
                          type="text"
                          placeholder="Enter district"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">PIN Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="682024"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Sales Route / Territory</label>
                      <select
                        value={territory}
                        onChange={(e) => setTerritory(e.target.value)}
                        disabled={!availableTerritories.length}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold"
                      >
                        <option value="">{availableTerritories.length ? 'Select assigned Territory' : 'No assigned Territories available'}</option>
                        {availableTerritories.map((entry) => (
                          <option key={entry.name} value={entry.name}>{entry.territory_name || entry.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('general')}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('gps')}
                      className="px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span>Next: GPS & Photo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: GPS PINNING & STOREFRONT PHOTO */}
              {onboardFormStep === 'gps' && (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* INTERACTIVE GEOLOCATION MAP PINNING */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-emerald-700" />
                        <span>Storefront Geolocation Map Pin</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Used for Driver Geofenced Delivery Drops
                      </span>
                    </div>
                    <InteractiveMapPin
                      initialLat={latitude}
                      initialLng={longitude}
                      initialAccuracy={gpsAccuracy}
                      onLocationChange={(loc) => {
                        setLatitude(loc.lat);
                        setLongitude(loc.lng);
                        setGpsAccuracy(loc.accuracy);
                      }}
                    />
                  </div>

                  {/* STOREFRONT PHOTO CAPTURE */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-700" />
                        <span>Exterior Facade & Signboard Photo</span>
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                        Required for Drivers
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Snap or upload a clear photo of the store facade and signboard. Delivery drivers use this exact photograph to verify drops!
                    </p>

                    {shopPhotoData ? (
                      <div className="relative mt-2 rounded-lg overflow-hidden border border-emerald-300 max-h-48">
                        <img src={shopPhotoData} alt="Preview" className="w-full h-44 object-cover" />
                        <button
                          type="button"
                          onClick={() => setShopPhotoData('')}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-white transition-colors">
                        <UploadCloud className="w-7 h-7 text-emerald-600 mb-1" />
                        <span className="text-xs font-semibold text-emerald-900">
                          Tap to Take Store Photo or Select File
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP supported</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('address')}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('tax')}
                      className="px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span>Next: Tax & KYC</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: TAX, LEGAL & KYC PROOFS */}
              {onboardFormStep === 'tax' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Tax & Statutory Details</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">GSTIN (Goods & Service Tax)</label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="32AAAAA0000A1Z5"
                          value={gstIn}
                          onChange={(e) => setGstIn(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono uppercase"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">GST Registration Category</label>
                        <select
                          value={gstCategory}
                          onChange={(e) => setGstCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        >
                          <option value="">Select GST Category</option>
                          {fieldSalesOptions.gst_categories.map((entry: string) => (
                            <option key={entry} value={entry}>{entry}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Permanent Account No (PAN)</label>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="ABCDE1234F"
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* KYC DOCUMENT UPLOADER */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-slate-500">
                      <FileCheck className="w-4 h-4 text-emerald-700" />
                      <span>Government Identity Proofs (Front & Back)</span>
                    </h4>
                    <KycDocumentUploader
                      documents={kycDocuments}
                      onDocumentsChange={setKycDocuments}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('gps')}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('credit')}
                      className="px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span>Next: Credit & Banking</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: COMMERCIAL CREDIT, BANKING & FIELD NOTES */}
              {onboardFormStep === 'credit' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                      <span>Commercial Credit & Trade Terms</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Proposed Credit Limit (₹)</label>
                        <input
                          type="number"
                          step={5000}
                          min={0}
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Credit Terms / Days</label>
                        <input
                          type="number"
                          min={0}
                          value={creditDays}
                          onChange={(e) => setCreditDays(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Applicable Price List</label>
                        <select
                          value={priceList}
                          onChange={(e) => setPriceList(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        >
                          <option value="">Select selling Price List</option>
                          {fieldSalesOptions.selling_price_lists.map((entry: any) => (
                            <option key={entry.name} value={entry.name}>{entry.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Estimated Monthly Purchasing Capacity</label>
                        <input
                          type="text"
                          placeholder="Enter estimated monthly purchasing capacity"
                          value={estimatedMonthlyTurnover}
                          onChange={(e) => setEstimatedMonthlyTurnover(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Weekly Closed Day / Holiday</label>
                        <input
                          type="text"
                          placeholder="Enter weekly closed day"
                          value={weeklyOffDay}
                          onChange={(e) => setWeeklyOffDay(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Major Brands Stocked</label>
                        <input
                          type="text"
                          placeholder="Supreme, Tata Tiscon, ACC, Finolex"
                          value={brandsStocked}
                          onChange={(e) => setBrandsStocked(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BANK DETAILS */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <LandmarkIcon className="w-4 h-4 text-blue-700" />
                      <span>Bank Account (Optional for Cheque Clearance)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="State Bank of India / Federal Bank"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                        <input
                          type="text"
                          placeholder="0123456789012"
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="SBIN0001234"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FIELD AGENT ASSESSMENT NOTES */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Field Agent Assessment & Market Observations
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. High retail footfall on market road. Proprietor Rajesh verified in-person. Keen on bulk ACC cement dealership and PVC fittings."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOnboardFormStep('tax')}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !!fieldOptionsError || !availableTerritories.length || !fieldSalesOptions.customer_groups.length || !fieldSalesOptions.selling_price_lists.length || !fieldSalesOptions.customer_types.length}
                      className="px-6 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-900" />
                      <span>{isSubmitting ? 'Registering Shop...' : 'Register Shop, GPS & KYC Profile'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG SHOP VISIT & ORDER */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Shop Visit & Demand</h3>
              </div>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVisitAndOrder} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Customer Shop</label>
                <select
                  value={selectedShopForAction}
                  onChange={(e) => setSelectedShopForAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                >
                  {allShops.map((s) => (
                    <option key={s.customer_name} value={s.customer_name}>
                      {s.customer_name} ({s.territory})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visit Purpose</label>
                <select
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                >
                  {fieldSalesOptions.visit_purposes.map((entry: string) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </div>

              {/* Order Capture Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  <span>On-Site Sales Order Demand</span>
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Catalog</label>
                    <select
                      value={orderItemCode}
                      onChange={(e) => setOrderItemCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      {realItems.length > 0 ? (
                        realItems.map((it) => (
                          <option key={it.name || it.item_code} value={it.item_code || it.name}>
                            {it.item_name || it.item_code} ({it.stock_uom || 'Nos'})
                          </option>
                        ))
                      ) : (
                        <option value="">No items available in ERP catalog</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  Note: Selling rates are automatically calculated on ERPNext server using the customer's authoritative price list.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visit Discussion Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record discussions, competitor pricing, feedback..."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Next Follow-Up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#090B0A] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Visit & Book Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT COLLECTION */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Payment Collection</h3>
              </div>
              <button
                onClick={() => setShowCollectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Shop</label>
                <select
                  value={selectedShopForAction}
                  onChange={(e) => setSelectedShopForAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                >
                  {allShops.map((s) => (
                    <option key={s.customer_name} value={s.customer_name}>
                      {s.customer_name} (Due: ₹{(s.outstanding || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Collected Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none text-base font-bold text-slate-900"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Supports lump-sum payments without exact invoice breakdown.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode of Payment</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fieldSalesOptions.payment_modes.map((mode: any) => (
                    <button
                      key={mode.name}
                      type="button"
                      onClick={() => setCollectMode(mode.name)}
                      className={`py-2 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
                        collectMode === mode
                          ? 'bg-[#090B0A] text-white border-[#090B0A]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                        {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transaction Ref / UPI UTR / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-1984210984 or Cheque #091244"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Record Payment Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DYNAMIC MULTI-PRODUCT SALES ORDER */}
      {showMultiOrderModal && (
        <MultiProductOrderModal
          customerName={selectedShopForAction || allShops[0]?.customer_name || ''}
          onClose={() => setShowMultiOrderModal(false)}
          onSuccess={(salesOrderRef: string, grandTotal: number) => {
            showToast(`Multi-product Sales Order ${salesOrderRef} (₹${grandTotal.toLocaleString('en-IN')}) placed successfully!`);
            setShowMultiOrderModal(false);
            loadData();
          }}
        />
      )}

      {/* MODAL 5: GEOFENCED VISIT CHECK-IN */}
      {showGeofencedVisitModal && (
        <GeofencedVisitModal
          customerName={selectedShopForAction || allShops[0]?.customer_name || ''}
          visitPurposes={fieldSalesOptions.visit_purposes}
          interestLevels={fieldSalesOptions.interest_levels}
          onClose={() => setShowGeofencedVisitModal(false)}
          onSuccess={(visitRef: string, geofenceStatus: string) => {
            showToast(`Geofenced visit ${visitRef} (${geofenceStatus}) logged successfully!`);
            setShowGeofencedVisitModal(false);
            loadData();
          }}
        />
      )}

      {/* FULL-SCREEN SHOP PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-2xl w-full bg-[#090B0A] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2">
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Shop Storefront Preview"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center">
              <span className="text-xs text-slate-300 font-medium">
                Storefront Photo uploaded by Field Sales Agent • Accessible to Delivery Drivers
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
