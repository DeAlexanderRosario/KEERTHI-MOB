/**
 * Module Registry & Configuration for Keerthi ERP
 */

export interface NavItem {
  id: string;
  label: string;
  doctype?: string;
  reportName?: string;
  icon?: string;
  isCustomView?: boolean;
}

export interface BusinessModule {
  id: string;
  label: string;
  description: string;
  icon: string;
  defaultDocType?: string;
  navItems: NavItem[];
  requiredRoles: string[]; // At least one of these roles is required for visibility
}

export const BUSINESS_MODULES: BusinessModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'System health, operational KPIs, and recent activity',
    icon: 'LayoutDashboard',
    navItems: [
      { id: 'overview', label: 'Executive Overview', isCustomView: true },
      { id: 'recent_invoices', label: 'Recent Invoices', doctype: 'Sales Invoice' },
      { id: 'stock_summary', label: 'Stock Levels', doctype: 'Item' },
    ],
    requiredRoles: ['All'],
  },
  {
    id: 'billing',
    label: 'Order Billing',
    description: 'Fast counter-sales billing, invoice drafting, and receipt generation',
    icon: 'Receipt',
    defaultDocType: 'Sales Invoice',
    navItems: [
      { id: 'counter_pos', label: 'Point of Sale', isCustomView: true },
      { id: 'invoices', label: 'Sales Invoices', doctype: 'Sales Invoice' },
      { id: 'customers', label: 'Customers', doctype: 'Customer' },
      { id: 'items', label: 'Items Catalog', doctype: 'Item' },
      { id: 'payments', label: 'Payment Entries', doctype: 'Payment Entry' },
    ],
    requiredRoles: ['Order Biller', 'Accounts User', 'Accounts Manager', 'Sales User', 'Sales Manager', 'System Manager'],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    description: 'General Ledger, Chart of Accounts, Invoicing, and Financial Statements',
    icon: 'Calculator',
    defaultDocType: 'Sales Invoice',
    navItems: [
      { id: 'financial_overview', label: 'Financial Overview', isCustomView: true },
      { id: 'sales_invoices', label: 'Sales Invoices', doctype: 'Sales Invoice' },
      { id: 'purchase_invoices', label: 'Purchase Invoices', doctype: 'Purchase Invoice' },
      { id: 'payment_entry', label: 'Payment Entries', doctype: 'Payment Entry' },
      { id: 'journal_entry', label: 'Journal Entries', doctype: 'Journal Entry' },
      { id: 'chart_of_accounts', label: 'Chart of Accounts', doctype: 'Account' },
      { id: 'general_ledger', label: 'General Ledger', reportName: 'General Ledger', isCustomView: true },
      { id: 'trial_balance', label: 'Trial Balance', reportName: 'Trial Balance', isCustomView: true },
      { id: 'profit_and_loss', label: 'Profit & Loss', reportName: 'Profit and Loss Statement', isCustomView: true },
      { id: 'balance_sheet', label: 'Balance Sheet', reportName: 'Balance Sheet', isCustomView: true },
    ],
    requiredRoles: ['Accountant', 'Accounts User', 'Accounts Manager', 'Auditor', 'System Manager'],
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    description: 'Customer relationships, quotations, orders, and sales performance',
    icon: 'TrendingUp',
    defaultDocType: 'Sales Order',
    navItems: [
      { id: 'customers', label: 'Customers', doctype: 'Customer' },
      { id: 'quotations', label: 'Quotations', doctype: 'Quotation' },
      { id: 'sales_orders', label: 'Sales Orders', doctype: 'Sales Order' },
      { id: 'sales_invoices', label: 'Invoices', doctype: 'Sales Invoice' },
    ],
    requiredRoles: ['Sales User', 'Sales Manager', 'Order Biller', 'System Manager'],
  },
  {
    id: 'purchases',
    label: 'Purchases',
    description: 'Supplier management, purchase orders, and goods receipts',
    icon: 'ShoppingBag',
    defaultDocType: 'Purchase Order',
    navItems: [
      { id: 'suppliers', label: 'Suppliers', doctype: 'Supplier' },
      { id: 'purchase_orders', label: 'Purchase Orders', doctype: 'Purchase Order' },
      { id: 'purchase_receipts', label: 'Purchase Receipts', doctype: 'Purchase Receipt' },
      { id: 'purchase_invoices', label: 'Purchase Invoices', doctype: 'Purchase Invoice' },
    ],
    requiredRoles: ['Purchase User', 'Purchase Manager', 'Stock User', 'System Manager'],
  },
  {
    id: 'stock',
    label: 'Stock & Inventory',
    description: 'Item master, warehouse stock movements, and inventory valuation',
    icon: 'Boxes',
    defaultDocType: 'Item',
    navItems: [
      { id: 'items', label: 'Items Catalog', doctype: 'Item' },
      { id: 'warehouses', label: 'Warehouses', doctype: 'Warehouse' },
      { id: 'stock_entries', label: 'Stock Entries', doctype: 'Stock Entry' },
      { id: 'delivery_notes', label: 'Delivery Notes', doctype: 'Delivery Note' },
      { id: 'stock_balance', label: 'Stock Balance Report', reportName: 'Stock Balance', isCustomView: true },
    ],
    requiredRoles: ['Stock User', 'Stock Manager', 'System Manager'],
  },
  {
    id: 'delivery',
    label: 'Delivery & Ops',
    description: 'Dispatches, delivery trips, and assigned delivery notes',
    icon: 'Truck',
    defaultDocType: 'Delivery Note',
    navItems: [
      { id: 'delivery_queue', label: 'Delivery Queue', isCustomView: true },
      { id: 'delivery_notes', label: 'Delivery Notes', doctype: 'Delivery Note' },
      { id: 'delivery_trips', label: 'Delivery Trips', doctype: 'Delivery Trip' },
    ],
    requiredRoles: ['Delivery Staff', 'Delivery User', 'Stock User', 'Stock Manager', 'System Manager'],
  },
  {
    id: 'hr',
    label: 'Employees & HR',
    description: 'Staff directory, attendance logs, and leave management',
    icon: 'Users',
    defaultDocType: 'Employee',
    navItems: [
      { id: 'employees', label: 'Employees', doctype: 'Employee' },
      { id: 'attendance', label: 'Attendance', doctype: 'Attendance' },
      { id: 'leave_applications', label: 'Leave Applications', doctype: 'Leave Application' },
    ],
    requiredRoles: ['HR User', 'HR Manager', 'System Manager'],
  },
  {
    id: 'reports',
    label: 'Reports Hub',
    description: 'Official ERPNext server reports with parameter filters and CSV export',
    icon: 'FileSpreadsheet',
    navItems: [
      { id: 'report_hub', label: 'Server Reports Hub', isCustomView: true },
    ],
    requiredRoles: ['All'],
  },
  {
    id: 'settings',
    label: 'Diagnostics',
    description: 'Connection status, server ping latency, and role authorization audit',
    icon: 'ShieldCheck',
    navItems: [
      { id: 'diagnostics', label: 'System Diagnostics', isCustomView: true },
    ],
    requiredRoles: ['All'],
  },
];
