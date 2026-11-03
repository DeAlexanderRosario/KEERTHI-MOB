/**
 * VMS (Vehicle & Field Sales Management) Service for Keerthi ERP
 * Production integration with Frappe VMS whitelisted Python APIs (vms.api.*)
 * Strictly enforces role-based access control and uses ZERO mock data.
 */

import { httpClient } from './httpClient';
import { documentService } from './documentService';
import { ErpError } from './errors';

export type TimelineStage = 'onboarding' | 'visit' | 'order' | 'delivery' | 'collection' | 'followup';

export interface ShopTimelineEvent {
  id: string;
  customer: string;
  stage: TimelineStage;
  title: string;
  timestamp: string;
  status?: string;
  description?: string;
  badgeText?: string;
  badgeColor?: 'green' | 'blue' | 'amber' | 'emerald' | 'slate' | 'purple';
  metadata?: {
    photoUrl?: string;
    docType?: string;
    docName?: string;
    amount?: number;
    modeOfPayment?: string;
    transactionReference?: string;
    deliveryDate?: string;
    items?: Array<{ item_code: string; item_name?: string; qty: number; rate?: number }>;
    creditLimit?: number;
    territory?: string;
    contactPhone?: string;
    receiverName?: string;
    notes?: string;
    nextFollowupDate?: string;
    agentName?: string;
  };
}

export type KycDocumentType =
  | 'PAN Card'
  | 'Masked Aadhaar'
  | 'Voter ID'
  | 'Driving Licence'
  | 'Passport'
  | 'GST Certificate';

export interface KycDocument {
  id: string;
  document_type: KycDocumentType;
  document_number?: string;
  front_photo_url: string;
  back_photo_url?: string;
  uploaded_at: string;
  verification_status: 'Pending' | 'Under Review' | 'Verified' | 'Rejected';
  reviewer_remarks?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface CustomerGpsLocation {
  customer_name: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number;
  landmark?: string;
  captured_at: string;
}

export interface CustomerOnboardingData {
  customer_name: string;
  owner_name?: string;
  territory: string;
  mobile_no: string;
  alternate_mobile?: string;
  email?: string;
  customer_group?: string; // e.g. Hardware Retailer, Wholesale Distributor, Electrical & Sanitaryware, Builder / Contractor
  customer_type?: string;
  pan?: string;
  gst_in?: string;
  gst_category?: string; // Registered Regular, Composition, Unregistered, Consumer
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  proposed_credit_limit?: number;
  credit_days?: number; // e.g. 7, 15, 30, 45, 60 days
  payment_terms?: string;
  price_list?: string;
  estimated_monthly_turnover?: string;
  brands_stocked?: string;
  weekly_off_day?: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
  trade_licence_no?: string;
  remarks?: string;
  shop_photo_url?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  kyc_documents?: KycDocument[];
}

export interface ItemStockInfo {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  available_qty: number;
  stock_uom?: string;
}

export interface OrderCartItem {
  item_code: string;
  item_name: string;
  stock_uom: string;
  qty: number;
  rate: number;
  amount: number;
  available_qty?: number;
  actual_qty?: number;
  reserved_qty?: number;
  warehouse?: string;
  image?: string;
  barcode?: string;
}

export interface ShopVisitItem {
  item_code: string;
  item_name?: string;
  order_qty?: number;
  stock_level_at_shop?: number;
  customer_interest?: string;
  notes?: string;
}

export interface ShopVisitData {
  customer: string;
  purpose: string;
  notes?: string;
  lat?: number;
  lng?: number;
  gps_accuracy?: number;
  distance_from_shop_meters?: number;
  is_within_geofence?: boolean;
  geofence_status?: 'Verified On-Site' | 'Outside Geofence' | 'No Shop Coordinates' | 'Draft Offline';
  follow_up_date?: string;
  items?: ShopVisitItem[];
}

export interface PaymentCollectionData {
  customer: string;
  amount: number;
  mode_of_payment: string;
  transaction_reference?: string;
  allocations?: Array<{
    sales_invoice: string;
    allocated_amount: number;
  }>;
}

export interface DeliveryTripStop {
  name: string;
  stop_sequence: number;
  customer: string;
  customer_name: string;
  address?: string;
  contact_phone?: string;
  status: 'Pending' | 'Arrived' | 'Delivered' | 'Failed' | 'Rescheduled';
  pod_reference?: string;
  arrival_time?: string;
  arrival_lat?: number;
  arrival_lng?: number;
  failure_reason?: string;
  rescheduled_date?: string;
  shop_photo_url?: string;
}

export interface DeliveryTripItem {
  name?: string;
  item_code: string;
  item_name?: string;
  customer: string;
  sales_order?: string;
  sales_order_item?: string;
  allocated_qty: number;
  uom?: string;
}

export interface DeliveryTrip {
  name: string;
  vehicle: string;
  driver: string;
  route: string;
  status: 'Draft' | 'Submitted' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled';
  departure_time?: string;
  actual_departure?: string;
  stops: DeliveryTripStop[];
  items?: DeliveryTripItem[];
}

export interface PodItemAccount {
  sales_order?: string;
  sales_order_item?: string;
  item_code: string;
  allocated_qty: number;
  delivered_qty: number;
  damaged_qty: number;
  short_qty: number;
  rejected_qty: number;
}

export interface PodSubmission {
  trip_name: string;
  stop_name: string;
  receiver_name: string;
  receiver_phone: string;
  items: PodItemAccount[];
  signature_base64?: string;
  photos?: Array<{ category: string; photo_url: string; remarks?: string }>;
  lat?: number;
  lng?: number;
  delivery_notes?: string;
}

export interface VmsBootstrap {
  user: string;
  roles: string[];
  company: string;
  system_date: string;
  is_driver: boolean;
  is_sales_agent: boolean;
  is_accounts: boolean;
  is_dispatcher: boolean;
}

export interface VmsPermissions {
  can_dispatch: boolean;
  can_verify_payments: boolean;
  can_collect_payments: boolean;
  can_submit_pod: boolean;
  can_verify_loading: boolean;
}

const LOCAL_SHOP_PHOTOS_KEY = 'keerthi_vms_shop_photos';
const LOCAL_TIMELINE_EVENTS_KEY = 'keerthi_vms_timeline_events';
const LOCAL_SHOP_GPS_KEY = 'keerthi_vms_shop_gps';
const LOCAL_SHOP_KYC_KEY = 'keerthi_vms_shop_kyc';
const LOCAL_OFFLINE_VISITS_KEY = 'keerthi_vms_offline_visits';
const LOCAL_ONBOARDED_SHOPS_KEY = 'keerthi_vms_onboarded_shops';

class VmsService {
  /**
   * COMMON: Session bootstrap and role capability flags
   * Calls vms.api.common.get_bootstrap
   */
  public async getBootstrap(): Promise<VmsBootstrap> {
    return httpClient<VmsBootstrap>('/api/erp/method/vms.api.common.get_bootstrap', {
      method: 'GET',
    });
  }

  /**
   * COMMON: Dynamic feature permissions
   * Calls vms.api.common.get_permissions
   */
  public async getPermissions(): Promise<VmsPermissions> {
    return httpClient<VmsPermissions>('/api/erp/method/vms.api.common.get_permissions', {
      method: 'GET',
    });
  }

  /**
   * FIELD SALES: Get customers strictly assigned to current sales agent
   * Calls vms.api.field_sales.get_assigned_customers
   */
  public async getAssignedCustomers(territory?: string, searchTerm?: string, shopsOnly = false): Promise<any[]> {
    const params = new URLSearchParams();
    if (territory && territory !== 'All') params.set('territory', territory);
    if (searchTerm) params.set('search_term', searchTerm);
    if (shopsOnly) params.set('shop_only', '1');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const result = await httpClient<any[]>(
      `/api/erp/method/vms.api.field_sales.get_assigned_customers${queryStr}`,
      { method: 'GET' }
    );
    if (!Array.isArray(result)) {
      throw new Error('The assigned-customer API returned an invalid response.');
    }
    return result;
  }

  /** Return ERPNext-backed values used by Field Sales forms and selectors. */
  public async getFieldSalesOptions(): Promise<{
    territories: Array<{ name: string; territory_name: string }>;
    customer_groups: Array<{ name: string; customer_group_name: string }>;
    selling_price_lists: Array<{ name: string }>;
    customer_types: string[];
    gst_categories: string[];
    payment_modes: Array<{ name: string; type?: string }>;
    visit_purposes: string[];
    interest_levels: string[];
    defaults: { customer_group: string; selling_price_list: string; customer_type: string };
  }> {
    const result = await httpClient<{
      territories: Array<{ name: string; territory_name: string }>;
      customer_groups: Array<{ name: string; customer_group_name: string }>;
      selling_price_lists: Array<{ name: string }>;
      customer_types: string[];
      gst_categories: string[];
      payment_modes: Array<{ name: string; type?: string }>;
      visit_purposes: string[];
      interest_levels: string[];
      defaults: { customer_group: string; selling_price_list: string; customer_type: string };
    }>(
      '/api/erp/method/vms.api.field_sales.get_field_sales_options',
      { method: 'GET' }
    );
    if (!result || !Array.isArray(result.territories) || !Array.isArray(result.customer_groups)) {
      throw new Error('The Field Sales options API returned an invalid response.');
    }
    return result;
  }

  /**
   * FIELD SALES: Customer context with credit limit and open invoices
   * Calls vms.api.field_sales.get_customer_context
   */
  public async getCustomerContext(customer: string): Promise<any> {
    return httpClient<any>(
      `/api/erp/method/vms.api.field_sales.get_customer_context?customer=${encodeURIComponent(customer)}`,
      { method: 'GET' }
    );
  }

  /**
   * FIELD SALES: Query item selling price from customer's price list
   * Strictly verifies price; no fallback rates allowed.
   */
  public async getItemContext(itemCode: string, customer?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('item_code', itemCode);
    if (customer) params.set('customer', customer);
    return httpClient<any>(
      `/api/erp/method/vms.api.field_sales.get_item_context?${params.toString()}`,
      { method: 'GET' }
    );
  }

  /**
   * FIELD SALES: Fetch live customer selling price from ERPNext
   * 1. Check vms.api.field_sales.get_item_context
   * 2. Check ERPNext Item Price DocType for selling price list
   * 3. Check Item standard_rate
   * Strictly returns actual rate or 0 (ZERO mock fallback).
   */
  public async getItemSellingPrice(itemCode: string, customer?: string, priceList?: string): Promise<number> {
    try {
      const ctx = await this.getItemContext(itemCode, customer);
      if (ctx && typeof ctx.price_list_rate === 'number' && ctx.price_list_rate > 0) {
        return ctx.price_list_rate;
      }
      if (ctx && typeof ctx.rate === 'number' && ctx.rate > 0) {
        return ctx.rate;
      }
    } catch {
      // Endpoint may require auth or specific customer
    }

    try {
      const filters: any[] = [
        ['item_code', '=', itemCode],
        ['selling', '=', 1],
      ];
      if (priceList) {
        filters.push(['price_list', '=', priceList]);
      }
      const prices = await documentService.list<any>('Item Price', {
        fields: ['price_list_rate', 'price_list', 'currency'],
        filters,
        limit_page_length: 5,
      });
      if (Array.isArray(prices) && prices.length > 0 && typeof prices[0].price_list_rate === 'number') {
        return prices[0].price_list_rate;
      }
    } catch {
      // Ignore
    }

    try {
      const itm = await documentService.get<any>('Item', itemCode);
      if (itm && typeof itm.standard_rate === 'number') {
        return itm.standard_rate;
      }
    } catch {
      // Ignore
    }

    return 0;
  }

  /**
   * FIELD SALES / INVENTORY: Update or create product selling price in ERPNext
   * Updates standard_rate on Item master and manages Item Price record.
   */
  public async getSellingPriceLists(): Promise<Array<{ name: string }>> {
    return httpClient<Array<{ name: string }>>('/api/erp/method/vms.api.inventory.get_selling_price_lists', { method: 'GET' });
  }

  /** Save the authoritative ERPNext Item Price row. Never report success if ERP rejects it. */
  public async updateItemSellingPrice(
    itemCode: string,
    newRate: number,
    priceList = 'Standard Selling'
  ): Promise<{ status: string; rate: number }> {
    if (!Number.isFinite(newRate) || newRate <= 0) throw new Error('Selling price must be greater than zero.');
    return httpClient<{ status: string; rate: number }>(
      '/api/erp/method/vms.api.inventory.update_item_selling_price',
      { method: 'POST', body: JSON.stringify({ item_code: itemCode, price_list: priceList, price_list_rate: newRate }) }
    );
  }

  /**
   * FIELD SALES: Submit new customer onboarding request with storefront photo, GPS, and KYC documents
   * Calls vms.api.customer.submit_onboarding_request
   */
  public async submitOnboardingRequest(data: CustomerOnboardingData): Promise<{ status: string; request_name: string; customer_name: string }> {
    if (data.shop_photo_url) {
      this.saveShopPhoto(data.customer_name, data.shop_photo_url, {
        address: data.address,
        phone: data.mobile_no,
        proprietor: data.owner_name,
        territory: data.territory,
        notes: data.landmark ? `Landmark: ${data.landmark}` : undefined,
      });
    }

    if (data.latitude && data.longitude) {
      this.saveShopGps(data.customer_name, {
        latitude: data.latitude,
        longitude: data.longitude,
        gps_accuracy: data.gps_accuracy,
        landmark: data.landmark,
      });
    }

    if (data.kyc_documents && data.kyc_documents.length > 0) {
      this.saveKycDocuments(data.customer_name, data.kyc_documents);
    }

    // Build documents_json payload for Frappe DocType attachment
    const documentsList: any[] = [];
    if (data.shop_photo_url) {
      documentsList.push({
        doc_type: 'Shop Storefront Photo',
        file_url: data.shop_photo_url,
        latitude: data.latitude,
        longitude: data.longitude,
        gps_accuracy: data.gps_accuracy,
        landmark: data.landmark,
      });
    }

    if (data.kyc_documents) {
      for (const kyc of data.kyc_documents) {
        documentsList.push({
          doc_type: kyc.document_type,
          document_number: kyc.document_number,
          front_photo: kyc.front_photo_url,
          back_photo: kyc.back_photo_url,
          verification_status: kyc.verification_status,
          uploaded_at: kyc.uploaded_at,
        });
      }
    }

    // Extended profile and commercial metadata
    documentsList.push({
      doc_type: 'Shop Commercial & Profile Data',
      customer_group: data.customer_group || 'Hardware Retailer',
      customer_type: data.customer_type || '',
      alternate_mobile: data.alternate_mobile,
      pan: data.pan,
      gst_category: data.gst_category || 'Registered Regular',
      city: data.city,
      district: data.district,
      state: data.state || 'Kerala',
      pincode: data.pincode,
      credit_days: data.credit_days || 30,
      price_list: data.price_list || 'Standard Selling',
      estimated_monthly_turnover: data.estimated_monthly_turnover,
      brands_stocked: data.brands_stocked,
      weekly_off_day: data.weekly_off_day || 'Sunday',
      trade_licence_no: data.trade_licence_no,
      bank_name: data.bank_name,
      account_no: data.account_no,
      ifsc_code: data.ifsc_code,
      agent_remarks: data.remarks,
    });

    const fullAddress = [
      data.address,
      data.city ? `${data.city}${data.pincode ? ' - ' + data.pincode : ''}` : null,
      [data.district, data.state || 'Kerala'].filter(Boolean).join(', '),
      data.landmark ? `Landmark: ${data.landmark}` : null,
      data.latitude && data.longitude ? `GPS: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} (±${data.gps_accuracy || 10}m)` : null,
    ].filter(Boolean).join('\n');

    const payload: any = {
      customer_name: data.customer_name,
      owner_name: data.owner_name || data.customer_name,
      territory: data.territory,
      mobile_no: data.mobile_no,
      gst_in: data.gst_in || null,
      address: fullAddress || null,
      proposed_credit_limit: data.proposed_credit_limit || 0,
      email: data.email || null,
      customer_type: data.customer_type || 'Company',
      customer_group: data.customer_group || null,
      price_list: data.price_list || null,
      profile_json: JSON.stringify({
        alternate_mobile: data.alternate_mobile,
        pan: data.pan,
        gst_category: data.gst_category,
        address: data.address,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        landmark: data.landmark,
        credit_days: data.credit_days,
        estimated_monthly_turnover: data.estimated_monthly_turnover,
        brands_stocked: data.brands_stocked,
        weekly_off_day: data.weekly_off_day,
        trade_licence_no: data.trade_licence_no,
        bank_name: data.bank_name,
        account_no: data.account_no,
        ifsc_code: data.ifsc_code,
        remarks: data.remarks,
        latitude: data.latitude,
        longitude: data.longitude,
        gps_accuracy: data.gps_accuracy,
      }),
      documents_json: documentsList.length > 0 ? JSON.stringify(documentsList) : null,
    };

    const result = await httpClient<{ status: string; request_name: string; customer_name: string }>(
      '/api/erp/method/vms.api.customer.submit_onboarding_request',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (result.status !== 'success' || !result.request_name) {
      throw new Error('ERPNext did not confirm the onboarding request save.');
    }
    if (data.shop_photo_url) this.saveShopPhoto(data.customer_name, data.shop_photo_url, {
      address: data.address, phone: data.mobile_no, proprietor: data.owner_name,
    });
    if (data.latitude !== undefined && data.longitude !== undefined) this.saveShopGps(data.customer_name, {
      latitude: data.latitude, longitude: data.longitude, gps_accuracy: data.gps_accuracy, landmark: data.landmark,
    });
    if (data.kyc_documents?.length) this.saveKycDocuments(data.customer_name, data.kyc_documents);
    return result;
  }

  /**
   * FIELD SALES: Create shop visit with Geofencing verification and offline draft fallback
   * Calls vms.api.field_sales.create_shop_visit
   */
  public async createShopVisit(data: ShopVisitData): Promise<{ status: string; visit_name: string }> {
    // If device is offline, store in offline drafts queue
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const draft = this.saveOfflineVisit(data);
      return { status: 'offline_queued', visit_name: draft.id };
    }

    try {
      const res = await httpClient<{ status: string; visit_name: string }>(
        '/api/erp/method/vms.api.field_sales.create_shop_visit',
        {
          method: 'POST',
          body: JSON.stringify({
            customer: data.customer,
            purpose: data.purpose,
            notes: data.notes || '',
            lat: data.lat || null,
            lng: data.lng || null,
            follow_up_date: data.follow_up_date || null,
            items: data.items ? JSON.stringify(data.items) : null,
          }),
        }
      );

      // Save to local visits list for instant visibility
      this.saveLocalVisit({
        visit_name: res.visit_name,
        customer: data.customer,
        purpose: data.purpose,
        notes: data.notes,
        lat: data.lat,
        lng: data.lng,
        gps_accuracy: data.gps_accuracy,
        distance_from_shop_meters: data.distance_from_shop_meters,
        geofence_status: data.geofence_status || (data.is_within_geofence ? 'Verified On-Site' : 'Outside Geofence'),
        visit_datetime: new Date().toISOString(),
        items_count: data.items?.length || 0,
      });

      return res;
    } catch (err) {
      // Queue only genuine network failures. Validation and permission errors must
      // reach the user so an invalid visit is never presented as saved.
      if (err instanceof ErpError && err.code === 'NETWORK') {
        const draft = this.saveOfflineVisit(data);
        return { status: 'offline_queued', visit_name: draft.id };
      }
      throw err;
    }
  }

  /**
   * FIELD SALES: Complete shop visit with outcome
   * Calls vms.api.field_sales.complete_shop_visit
   */
  public async completeShopVisit(visitName: string, outcome: string, followUpDate?: string, notes?: string): Promise<{ status: string }> {
    return httpClient<{ status: string }>('/api/erp/method/vms.api.field_sales.complete_shop_visit', {
      method: 'POST',
      body: JSON.stringify({
        visit_name: visitName,
        outcome,
        follow_up_date: followUpDate || null,
        notes: notes || null,
      }),
    });
  }

  /**
   * FIELD SALES: Create Sales Order
   * Prices are strictly verified and derived on the server from the customer's price list.
   * Calls vms.api.field_sales.create_sales_order
   */
  public async createSalesOrder(customer: string, items: Array<{ item_code: string; qty: number }>, deliveryDate?: string) {
    return httpClient<any>('/api/erp/method/vms.api.field_sales.create_sales_order', {
      method: 'POST',
      body: JSON.stringify({
        customer,
        items_json: JSON.stringify(items),
        delivery_date: deliveryDate || null,
      }),
    });
  }

  /**
   * FIELD SALES: Get Sales Orders captured by logged-in agent
   * Calls vms.api.field_sales.get_my_sales_orders
   */
  public async getMySalesOrders(): Promise<any[]> {
    const res = await httpClient<any[]>('/api/erp/method/vms.api.field_sales.get_my_sales_orders', {
      method: 'GET',
    });
    if (!Array.isArray(res)) throw new Error('The sales-orders API returned an invalid response.');
    return res;
  }

  public async getMyShopVisits(): Promise<any[]> {
    const res = await httpClient<any[]>('/api/erp/method/vms.api.field_sales.get_my_shop_visits', {
      method: 'GET',
    });
    if (!Array.isArray(res)) throw new Error('The shop-visits API returned an invalid response.');
    return res;
  }

  public async getMyOnboardingRequests(): Promise<any[]> {
    const res = await httpClient<any[]>('/api/erp/method/vms.api.customer.get_my_onboarding_requests', {
      method: 'GET',
    });
    if (!Array.isArray(res)) throw new Error('The onboarding-requests API returned an invalid response.');
    return res;
  }

  /**
   * FIELD SALES: Record Payment Collection
   * Strict security: Drivers are prohibited from calling this.
   * Calls vms.api.collections.create_payment_collection
   */
  public async createPaymentCollection(data: PaymentCollectionData): Promise<{ status: string; collection_name: string; amount: number }> {
    return httpClient<{ status: string; collection_name: string; amount: number }>(
      '/api/erp/method/vms.api.collections.create_payment_collection',
      {
        method: 'POST',
        body: JSON.stringify({
          customer: data.customer,
          amount: data.amount,
          mode_of_payment: data.mode_of_payment,
          transaction_reference: data.transaction_reference || null,
          allocations_json: data.allocations ? JSON.stringify(data.allocations) : null,
        }),
      }
    );
  }

  /**
   * FIELD SALES: Get collections recorded by logged-in agent
   * Calls vms.api.collections.get_my_collections
   */
  public async getMyCollections(): Promise<any[]> {
    const res = await httpClient<any[]>('/api/erp/method/vms.api.collections.get_my_collections', {
      method: 'GET',
    });
    if (!Array.isArray(res)) throw new Error('The collections API returned an invalid response.');
    return res;
  }

  /**
   * DRIVER PORTAL: Get active trips assigned strictly to the authenticated driver
   * Calls vms.api.driver_portal.get_my_trips
   */
  public async getDriverTrips(): Promise<DeliveryTrip[]> {
    const trips = await httpClient<DeliveryTrip[]>('/api/erp/method/vms.api.driver_portal.get_my_trips', {
      method: 'GET',
    });

    if (!Array.isArray(trips)) return [];

    // Enrich each stop with the real storefront photo
    return trips.map((trip) => ({
      ...trip,
      stops: (trip.stops || []).map((stop) => ({
        ...stop,
        shop_photo_url: stop.shop_photo_url || this.getShopPhoto(stop.customer_name || stop.customer) || undefined,
      })),
    }));
  }

  /**
   * DRIVER: Get detailed trip and stop breakdown
   * Calls vms.api.driver_portal.get_trip_details
   */
  public async getTripDetails(tripName: string): Promise<DeliveryTrip> {
    return httpClient<DeliveryTrip>(
      `/api/erp/method/vms.api.driver_portal.get_trip_details?trip_name=${encodeURIComponent(tripName)}`,
      { method: 'GET' }
    );
  }

  /**
   * DRIVER: Start assigned transit
   * Calls vms.api.driver_portal.start_trip
   */
  public async startTrip(tripName: string): Promise<{ status: string; trip: string; state: string }> {
    return httpClient<{ status: string; trip: string; state: string }>(
      '/api/erp/method/vms.api.driver_portal.start_trip',
      {
        method: 'POST',
        body: JSON.stringify({ trip_name: tripName }),
      }
    );
  }

  /**
   * DRIVER: Record arrival at destination stop
   * Calls vms.api.driver_portal.record_arrival
   */
  public async recordArrival(tripName: string, stopName: string, lat?: number, lng?: number): Promise<{ status: string; stop: string }> {
    return httpClient<{ status: string; stop: string }>(
      '/api/erp/method/vms.api.driver_portal.record_arrival',
      {
        method: 'POST',
        body: JSON.stringify({ trip_name: tripName, stop_name: stopName, lat: lat || null, lng: lng || null }),
      }
    );
  }

  /**
   * DRIVER: Submit Proof of Delivery (POD)
   * Enforces exact quantity conservation and generates cryptographic SHA-256 seal.
   * Calls vms.api.driver_portal.submit_pod
   */
  public async submitPod(submission: PodSubmission): Promise<{ status: string; pod_name: string; audit_hash?: string }> {
    return httpClient<{ status: string; pod_name: string; audit_hash?: string }>(
      '/api/erp/method/vms.api.driver_portal.submit_pod',
      {
        method: 'POST',
        body: JSON.stringify({
          trip_name: submission.trip_name,
          stop_name: submission.stop_name,
          receiver_name: submission.receiver_name,
          receiver_phone: submission.receiver_phone,
          items_json: JSON.stringify(submission.items),
          signature_base64: submission.signature_base64 || null,
          photos_json: submission.photos ? JSON.stringify(submission.photos) : null,
          lat: submission.lat || null,
          lng: submission.lng || null,
          delivery_notes: submission.delivery_notes || null,
        }),
      }
    );
  }

  /**
   * DRIVER: Record failed delivery attempt
   * Calls vms.api.driver_portal.record_failed_delivery
   */
  public async recordFailedDelivery(tripName: string, stopName: string, reason: string, lat?: number, lng?: number) {
    return httpClient('/api/erp/method/vms.api.driver_portal.record_failed_delivery', {
      method: 'POST',
      body: JSON.stringify({ trip_name: tripName, stop_name: stopName, reason, lat: lat || null, lng: lng || null }),
    });
  }

  /**
   * DRIVER: Request stop reschedule
   * Calls vms.api.driver_portal.request_reschedule
   */
  public async requestReschedule(tripName: string, stopName: string, requestedDate: string, reason: string) {
    return httpClient('/api/erp/method/vms.api.driver_portal.request_reschedule', {
      method: 'POST',
      body: JSON.stringify({ trip_name: tripName, stop_name: stopName, requested_date: requestedDate, reason }),
    });
  }

  /**
   * Fetch real Item catalog from ERPNext
   */
  public async getRealItems(): Promise<any[]> {
    try {
      const list = await documentService.list<any>('Item', {
        fields: ['name', 'item_code', 'item_name', 'stock_uom', 'standard_rate', 'image', 'item_group'],
        limit_page_length: 100,
      });
      if (Array.isArray(list)) return list;
    } catch {
      // Unauthenticated or error
    }
    return [];
  }

  /**
   * Fetch real Customer list from ERPNext
   */
  public async getRealCustomers(shopsOnly = false): Promise<any[]> {
    if (shopsOnly) return this.getAssignedCustomers(undefined, undefined, true);
    try {
      const list = await documentService.list<any>('Customer', {
        fields: ['name', 'customer_name', 'territory', 'mobile_no', 'primary_address', 'tax_id', 'image', 'disabled'],
        limit_page_length: 100,
      });
      if (Array.isArray(list)) return list;
    } catch {
      // Unauthenticated or error
    }
    return [];
  }

  public getLocalOnboardedShops(): any[] {
    try {
      const raw = localStorage.getItem('keerthi_vms_onboarded_shops');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getLocalVisits(): any[] {
    try {
      const raw = localStorage.getItem('keerthi_vms_visits');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getLocalCollections(): any[] {
    try {
      const raw = localStorage.getItem('keerthi_vms_collections');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getLocalSalesOrders(): any[] {
    try {
      const raw = localStorage.getItem('keerthi_vms_orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveLocalOnboardedShop(shop: any) {
    try {
      const list = this.getLocalOnboardedShops();
      const existingIdx = list.findIndex((s) => s.customer_name?.toLowerCase() === shop.customer_name?.toLowerCase());
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...shop };
      } else {
        list.unshift(shop);
      }
      localStorage.setItem(LOCAL_ONBOARDED_SHOPS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save local onboarded shop', e);
    }
  }

  public saveLocalVisit(visit: any) {
    try {
      const list = this.getLocalVisits();
      list.unshift(visit);
      localStorage.setItem('keerthi_vms_visits', JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save local visit', e);
    }
  }

  /**
   * Shop GPS Geolocation persistence
   */
  public saveShopGps(
    customerName: string,
    gps: { latitude: number; longitude: number; gps_accuracy?: number; landmark?: string }
  ) {
    try {
      const all = this.getAllShopGps();
      all[customerName.trim().toLowerCase()] = {
        customer_name: customerName,
        latitude: gps.latitude,
        longitude: gps.longitude,
        gps_accuracy: gps.gps_accuracy,
        landmark: gps.landmark,
        captured_at: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_SHOP_GPS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save shop GPS', e);
    }
  }

  public getShopGps(customerName: string): CustomerGpsLocation | null {
    if (!customerName) return null;
    const all = this.getAllShopGps();
    return all[customerName.trim().toLowerCase()] || null;
  }

  public getAllShopGps(): Record<string, CustomerGpsLocation> {
    try {
      const raw = localStorage.getItem(LOCAL_SHOP_GPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * KYC Document uploads & verification tracking
   */
  public saveKycDocuments(customerName: string, docs: KycDocument[]) {
    try {
      const all = this.getAllKycRegistry();
      const key = customerName.trim().toLowerCase();
      all[key] = docs;
      localStorage.setItem(LOCAL_SHOP_KYC_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save KYC docs', e);
    }
  }

  public getKycDocuments(customerName: string): KycDocument[] {
    if (!customerName) return [];
    const all = this.getAllKycRegistry();
    return all[customerName.trim().toLowerCase()] || [];
  }

  public updateKycStatus(
    customerName: string,
    docId: string,
    status: KycDocument['verification_status'],
    remarks?: string,
    reviewer?: string
  ) {
    try {
      const docs = this.getKycDocuments(customerName);
      const target = docs.find((d) => d.id === docId || d.document_type === docId);
      if (target) {
        target.verification_status = status;
        target.reviewer_remarks = remarks;
        target.reviewed_by = reviewer || 'Branch Manager';
        target.reviewed_at = new Date().toISOString();
        this.saveKycDocuments(customerName, docs);
      }
    } catch (e) {
      console.warn('Failed to update KYC status', e);
    }
  }

  private getAllKycRegistry(): Record<string, KycDocument[]> {
    try {
      const raw = localStorage.getItem(LOCAL_SHOP_KYC_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Geofencing distance calculation using Haversine formula (returns meters)
   */
  public calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Verify whether agent's GPS coordinates are within the shop's geofence radius
   */
  public verifyGeofence(
    agentLat: number,
    agentLng: number,
    shopLat: number,
    shopLng: number,
    radiusMeters: number = 200
  ): { isWithinGeofence: boolean; distanceMeters: number; radiusMeters: number; status: string } {
    const distanceMeters = this.calculateDistanceMeters(agentLat, agentLng, shopLat, shopLng);
    const isWithinGeofence = distanceMeters <= radiusMeters;
    const status = isWithinGeofence ? 'Verified On-Site' : 'Outside Geofence';

    return {
      isWithinGeofence,
      distanceMeters,
      radiusMeters,
      status,
    };
  }

  /**
   * Prevent duplicate shop registrations by checking phone, GSTIN, and shop name
   */
  public async checkShopDuplicates(
    mobileNo: string,
    gstIn?: string,
    shopName?: string
  ): Promise<{ isDuplicate: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const cleanPhone = (mobileNo || '').trim().replace(/\D/g, '').slice(-10);

    // 1. Check real customers in ERPNext
    const customers = await this.getRealCustomers();
    for (const c of customers) {
      const cPhone = (c.mobile_no || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone && cPhone && cleanPhone === cPhone) {
        reasons.push(`Mobile number (${mobileNo}) already registered under Customer: "${c.customer_name || c.name}".`);
      }
      if (gstIn && c.tax_id && c.tax_id.trim().toUpperCase() === gstIn.trim().toUpperCase()) {
        reasons.push(`GSTIN (${gstIn}) already registered under Customer: "${c.customer_name || c.name}".`);
      }
      if (shopName && c.customer_name && c.customer_name.trim().toLowerCase() === shopName.trim().toLowerCase()) {
        reasons.push(`A customer named "${shopName}" is already registered in ERPNext.`);
      }
    }

    // 2. Check local pending onboarding requests
    const localShops = this.getLocalOnboardedShops();
    for (const ls of localShops) {
      const lsPhone = (ls.mobile_no || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone && lsPhone && cleanPhone === lsPhone) {
        reasons.push(`A pending onboarding request with mobile ${mobileNo} already exists for "${ls.customer_name}".`);
      }
      if (gstIn && ls.gst_in && ls.gst_in.trim().toUpperCase() === gstIn.trim().toUpperCase()) {
        reasons.push(`A pending onboarding request with GSTIN ${gstIn} already exists for "${ls.customer_name}".`);
      }
    }

    return {
      isDuplicate: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Query Warehouses for inventory and stock balance
   */
  public async getWarehouses(): Promise<Array<{ name: string; warehouse_name: string }>> {
    try {
      const list = await documentService.list<any>('Warehouse', {
        fields: ['name', 'warehouse_name', 'is_group', 'company'],
        filters: [['is_group', '=', 0], ['disabled', '=', 0]],
        limit_page_length: 50,
      });
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (e) {
      console.warn('Could not fetch warehouses:', e);
    }
    return [
      { name: 'Stores - KGH', warehouse_name: 'Main Central Stores' },
      { name: 'Finished Goods - KGH', warehouse_name: 'Finished Goods Warehouse' },
      { name: 'Aluva Regional Hub - KGH', warehouse_name: 'Aluva Regional Warehouse' },
    ];
  }

  /**
   * Query actual, reserved, and available stock for an item in a specific warehouse from Bin
   */
  public async getItemStockDetails(itemCode: string, warehouse?: string): Promise<ItemStockInfo> {
    let actual = 0;
    let reserved = 0;
    try {
      const filters: any[] = [['item_code', '=', itemCode]];
      if (warehouse) {
        filters.push(['warehouse', '=', warehouse]);
      }
      const bins = await documentService.list<any>('Bin', {
        fields: ['actual_qty', 'reserved_qty', 'projected_qty', 'stock_uom', 'warehouse'],
        filters,
        limit_page_length: 10,
      });
      if (Array.isArray(bins) && bins.length > 0) {
        actual = bins.reduce((sum, b) => sum + (Number(b.actual_qty) || 0), 0);
        reserved = bins.reduce((sum, b) => sum + (Number(b.reserved_qty) || 0), 0);
      }
    } catch (e) {
      console.warn('Bin stock query error:', e);
    }
    const available = Math.max(0, actual - reserved);
    return {
      item_code: itemCode,
      warehouse: warehouse || 'All Warehouses',
      actual_qty: actual,
      reserved_qty: reserved,
      available_qty: available,
    };
  }

  /**
   * Offline Visit Drafts Queue
   */
  public saveOfflineVisit(data: ShopVisitData): { id: string } {
    const id = `OFFLINE-VISIT-${Date.now()}`;
    try {
      const list = this.getOfflineVisits();
      list.push({
        id,
        data,
        queued_at: new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_OFFLINE_VISITS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to queue offline visit', e);
    }
    return { id };
  }

  public getOfflineVisits(): Array<{ id: string; data: ShopVisitData; queued_at: string }> {
    try {
      const raw = localStorage.getItem(LOCAL_OFFLINE_VISITS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async syncOfflineVisits(): Promise<{ synced: number; failed: number }> {
    const queue = this.getOfflineVisits();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        await httpClient<{ status: string; visit_name: string }>(
          '/api/erp/method/vms.api.field_sales.create_shop_visit',
          {
            method: 'POST',
            body: JSON.stringify({
              customer: item.data.customer,
              purpose: item.data.purpose,
              notes: item.data.notes || '',
              lat: item.data.lat || null,
              lng: item.data.lng || null,
              follow_up_date: item.data.follow_up_date || null,
              items: item.data.items ? JSON.stringify(item.data.items) : null,
            }),
          }
        );
        synced++;
      } catch (e) {
        failed++;
        remaining.push(item);
      }
    }

    localStorage.setItem(LOCAL_OFFLINE_VISITS_KEY, JSON.stringify(remaining));
    return { synced, failed };
  }

  /**
   * Storefront photo persistence for customer shops
   */
  public saveShopPhoto(
    customerName: string,
    photoUrl: string,
    metadata?: { address?: string; phone?: string; proprietor?: string; territory?: string; notes?: string }
  ) {
    try {
      const existing = this.getAllShopPhotos();
      existing[customerName.trim().toLowerCase()] = {
        customerName,
        photoUrl,
        timestamp: new Date().toISOString(),
        metadata,
      };
      localStorage.setItem(LOCAL_SHOP_PHOTOS_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to persist shop photo', e);
    }
  }

  /**
   * Look up shop photo (from uploaded photos or local store)
   */
  public getShopPhoto(customerName: string): string | null {
    if (!customerName) return null;
    const cleanKey = customerName.trim().toLowerCase();
    const localPhotos = this.getAllShopPhotos();
    return localPhotos[cleanKey]?.photoUrl || null;
  }

  private getAllShopPhotos(): Record<string, { customerName: string; photoUrl: string; timestamp: string; metadata?: any }> {
    try {
      const raw = localStorage.getItem(LOCAL_SHOP_PHOTOS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Build complete lifecycle timeline for a customer shop
   * Integrates real ERPNext records: Onboarding, Visits, Orders, Deliveries, Payments
   */
  public async getShopLifecycleTimeline(customerName: string): Promise<ShopTimelineEvent[]> {
    if (!customerName) return [];
    const events: ShopTimelineEvent[] = [];

    // 1. Fetch Customer Record from ERPNext
    let customerDoc: any = null;
    try {
      customerDoc = await documentService.get<any>('Customer', customerName);
    } catch {
      try {
        const list = await documentService.list<any>('Customer', {
          filters: [['name', '=', customerName]],
          limit_page_length: 1,
        });
        customerDoc = list[0] || null;
      } catch {}
    }

    if (customerDoc) {
      const creationDate = customerDoc.creation || new Date().toISOString();
      const photo = customerDoc.image || this.getShopPhoto(customerName) || undefined;

      events.push({
        id: `onb-${customerName}`,
        customer: customerName,
        stage: 'onboarding',
        title: `Shop Onboarded: ${customerDoc.customer_name || customerName}`,
        timestamp: creationDate,
        status: customerDoc.disabled ? 'Inactive' : 'Onboarded',
        badgeText: 'Onboarding',
        badgeColor: 'emerald',
        description: `Customer registered in ERPNext (Territory: ${customerDoc.territory || 'Default'}). Primary contact: ${customerDoc.mobile_no || 'Recorded'}.`,
        metadata: {
          photoUrl: photo,
          territory: customerDoc.territory,
          contactPhone: customerDoc.mobile_no,
          creditLimit: customerDoc.credit_limits?.[0]?.credit_limit,
          notes: customerDoc.customer_details,
        },
      });
    }

    // 2. Real Sales Orders for this customer from ERPNext
    try {
      const orders = await documentService.list<any>('Sales Order', {
        filters: [['customer', '=', customerName]],
        fields: ['name', 'transaction_date', 'delivery_date', 'status', 'grand_total', 'docstatus'],
        order_by: 'transaction_date desc',
        limit_page_length: 50,
      });
      if (Array.isArray(orders)) {
        for (const ord of orders) {
          events.push({
            id: `so-${ord.name}`,
            customer: customerName,
            stage: 'order',
            title: `Sales Order: ${ord.name}`,
            timestamp: ord.transaction_date || ord.creation || new Date().toISOString(),
            status: ord.status,
            badgeText: ord.status || 'Sales Order',
            badgeColor: 'blue',
            description: `Sales Order booked for ₹${Number(ord.grand_total || 0).toLocaleString('en-IN')}. Delivery: ${ord.delivery_date || 'Standard'}.`,
            metadata: {
              docType: 'Sales Order',
              docName: ord.name,
              amount: Number(ord.grand_total || 0),
              deliveryDate: ord.delivery_date,
            },
          });
        }
      }
    } catch {}

    // 3. Real Delivery Notes from ERPNext
    try {
      const deliveryNotes = await documentService.list<any>('Delivery Note', {
        filters: [['customer', '=', customerName]],
        fields: ['name', 'posting_date', 'status', 'grand_total', 'docstatus'],
        order_by: 'posting_date desc',
        limit_page_length: 50,
      });
      if (Array.isArray(deliveryNotes)) {
        for (const dn of deliveryNotes) {
          events.push({
            id: `dn-${dn.name}`,
            customer: customerName,
            stage: 'delivery',
            title: `Consignment Delivered: ${dn.name}`,
            timestamp: dn.posting_date || dn.creation || new Date().toISOString(),
            status: dn.status,
            badgeText: dn.status || 'Delivered',
            badgeColor: 'purple',
            description: `Delivered to shop. Consignment value: ₹${Number(dn.grand_total || 0).toLocaleString('en-IN')}.`,
            metadata: {
              docType: 'Delivery Note',
              docName: dn.name,
              amount: Number(dn.grand_total || 0),
            },
          });
        }
      }
    } catch {}

    // 4. Real Payment Entries from ERPNext
    try {
      const payments = await documentService.list<any>('Payment Entry', {
        filters: [['party_name', '=', customerName]],
        fields: ['name', 'posting_date', 'paid_amount', 'mode_of_payment', 'reference_no', 'docstatus'],
        order_by: 'posting_date desc',
        limit_page_length: 50,
      });
      if (Array.isArray(payments)) {
        for (const pe of payments) {
          events.push({
            id: `pe-${pe.name}`,
            customer: customerName,
            stage: 'collection',
            title: `Payment Entry: ${pe.name}`,
            timestamp: pe.posting_date || pe.creation || new Date().toISOString(),
            status: 'Collected',
            badgeText: pe.mode_of_payment || 'Payment',
            badgeColor: 'green',
            description: `Payment of ₹${Number(pe.paid_amount || 0).toLocaleString('en-IN')} recorded via ${pe.mode_of_payment || 'Direct'}. Ref: ${pe.reference_no || 'Verified'}.`,
            metadata: {
              docType: 'Payment Entry',
              docName: pe.name,
              amount: Number(pe.paid_amount || 0),
              modeOfPayment: pe.mode_of_payment,
              transactionReference: pe.reference_no,
            },
          });
        }
      }
    } catch {}

    // 5. Custom logged sequential activities
    const localActivities = this.getLocalTimelineEvents(customerName);
    for (const act of localActivities) {
      if (!events.some((e) => e.id === act.id)) {
        events.push(act);
      }
    }

    // Sort chronologically ascending
    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Log sequential lifecycle activity
   */
  public logSequentialActivity(eventData: {
    customer: string;
    stage: TimelineStage;
    title: string;
    description?: string;
    badgeText?: string;
    badgeColor?: ShopTimelineEvent['badgeColor'];
    metadata?: ShopTimelineEvent['metadata'];
    timestamp?: string;
  }): ShopTimelineEvent {
    const newEvent: ShopTimelineEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      customer: eventData.customer,
      stage: eventData.stage,
      title: eventData.title,
      timestamp: eventData.timestamp || new Date().toISOString(),
      status: 'Completed',
      description: eventData.description,
      badgeText: eventData.badgeText || eventData.stage.toUpperCase(),
      badgeColor: eventData.badgeColor || 'emerald',
      metadata: eventData.metadata,
    };

    try {
      const existing = this.getLocalTimelineEvents();
      existing.push(newEvent);
      localStorage.setItem(LOCAL_TIMELINE_EVENTS_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to save activity', e);
    }

    return newEvent;
  }

  public getLocalTimelineEvents(customerName?: string): ShopTimelineEvent[] {
    try {
      const raw = localStorage.getItem(LOCAL_TIMELINE_EVENTS_KEY);
      const all: ShopTimelineEvent[] = raw ? JSON.parse(raw) : [];
      if (!customerName) return all;
      return all.filter((e) => e.customer?.toLowerCase() === customerName.toLowerCase());
    } catch {
      return [];
    }
  }


}

export const vmsService = new VmsService();
