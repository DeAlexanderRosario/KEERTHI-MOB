/**
 * Persona Mappings & Role Resolution
 * Maps ERPNext roles to product personas and permitted UI scopes.
 */

export interface PersonaDefinition {
  key: string;
  label: string;
  description: string;
  targetErpRoles: string[];
  defaultModule: string;
}

export const PERSONA_DEFINITIONS: PersonaDefinition[] = [
  {
    key: 'system_admin',
    label: 'System Administrator',
    description: 'Full administrative access to all modules, integrations, and reports',
    targetErpRoles: ['System Manager', 'Administrator'],
    defaultModule: 'dashboard',
  },
  {
    key: 'order_biller',
    label: 'Order Biller',
    description: 'Fast counter-sales, order creation, item search, and invoice drafting',
    targetErpRoles: ['Order Biller'],
    defaultModule: 'billing',
  },
  {
    key: 'accountant',
    label: 'Accountant',
    description: 'Financial ledgers, invoices, payment entries, and financial statements',
    targetErpRoles: ['Accounts User', 'Accounts Manager', 'Auditor'],
    defaultModule: 'accounts',
  },
  {
    key: 'sales_staff',
    label: 'Sales Staff',
    description: 'Customer management, quotations, and sales order fulfillment',
    targetErpRoles: ['Sales User', 'Sales Manager'],
    defaultModule: 'sales',
  },
  {
    key: 'stock_user',
    label: 'Stock / Warehouse User',
    description: 'Inventory levels, warehouses, stock entries, and goods transfers',
    targetErpRoles: ['Stock User', 'Stock Manager'],
    defaultModule: 'stock',
  },
  {
    key: 'delivery_staff',
    label: 'Delivery Staff',
    description: 'Delivery dispatch queue, trip updates, and order confirmations',
    targetErpRoles: ['Delivery User', 'Delivery Staff'],
    defaultModule: 'delivery',
  },
  {
    key: 'hr_user',
    label: 'HR User',
    description: 'Employee records, daily attendance tracking, and leave requests',
    targetErpRoles: ['HR User', 'HR Manager'],
    defaultModule: 'hr',
  },
  {
    key: 'manager',
    label: 'Operations Manager',
    description: 'Cross-functional operational monitoring, sales, stock, and approvals',
    targetErpRoles: ['Sales Manager', 'Stock Manager', 'Accounts Manager'],
    defaultModule: 'dashboard',
  },
];

/**
 * Resolves the primary persona matching the user's ERPNext roles
 */
export function resolvePrimaryPersona(userRoles: string[]): PersonaDefinition {
  if (userRoles.includes('Administrator') || userRoles.includes('System Manager')) {
    return PERSONA_DEFINITIONS[0]; // system_admin
  }

  for (const persona of PERSONA_DEFINITIONS) {
    if (persona.targetErpRoles.some((r) => userRoles.includes(r))) {
      return persona;
    }
  }

  // Fallback if user has generic roles
  return {
    key: 'standard_user',
    label: 'ERP User',
    description: 'Standard access based on assigned ERPNext roles',
    targetErpRoles: userRoles,
    defaultModule: 'dashboard',
  };
}
