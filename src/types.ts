export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  costPrice: number;       // in UGX (Ugandan Shillings) 
  sellingPrice: number;    // in UGX
  quantity: number;        // total sum stock quantity
  safeLevel: number;       // low stock threshold boundary
  expiryDate: string;      // YYYY-MM-DD
  imageUrl: string;        // placeholder or beauty shot
  description?: string;
  lastStockIn?: string;    // YYYY-MM-DD
  // NEW ADVANCED BEAUTY FIELDS
  batchNumber?: string;    // Batch & Lot management
  shadeVariants?: string[]; // Cosmetic shade variants
  isBundle?: boolean;      // True if it's a bundled makeup/skincare kit
  bundleComponents?: { productId: string; quantity: number }[]; // List of component item IDs and quantities
  locationStocks?: {       // Multi-channel Stocking outlets
    kampala: number;
    wandegeya: number;
    entebbe: number;
  };
}

export type StaffRole = 'Owner / Manager' | 'Sales Cashier' | 'Store Accountant';

export interface StaffUserProfile {
  username: string;
  fullName: string;
  role: StaffRole;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  verificationCode?: string; // Specific dynamic code generated per item bought
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  totalAmount: number;
  discount: number;         // Flat discount in UGX
  paidAmount: number;       // Amount paid by customer
  balanceDue: number;       // Debt (outstanding) if balanceDue > 0
  paymentMethod: 'Cash' | 'MTN Mobile Money' | 'Airtel Money' | 'Card' | 'Credit';
  customerName?: string;
  customerPhone?: string;
  date: string;             // ISO date-time string
  verificationCode?: string; // Specific dynamic code generated for the overall purchase
  location?: 'kampala' | 'wandegeya' | 'entebbe'; // Outlet branch location
}

export interface Expense {
  id: string;
  title: string;
  amount: number;           // in UGX
  category: 'Rent' | 'Electricity & Water' | 'Transport & Customs' | 'Marketing' | 'Packaging & Delivery' | 'Staff Wages' | 'Other';
  date: string;             // YYYY-MM-DD
  notes?: string;
}

export interface CategoryStats {
  category: string;
  productCount: number;
  stockCount: number;
  stockValue: number;       // quantity * sellingPrice
}

export interface DailySummary {
  date: string;             // YYYY-MM-DD
  sales: number;
  profit: number;
  expenses: number;
}

export interface AlertEmailLog {
  id: string;
  recipientList: string[];
  subject: string;
  body: string;
  timestamp: string;
  triggerType: 'Manual Test' | 'Automated Low Stock' | 'Automated Out of Stock' | 'Automated Expiry';
  status: 'Sent Successfully' | 'Pending';
}

export interface AdminEmailSetting {
  emails: string[];
  enableLowStockAlert: boolean;
  enableOutOfStockAlert: boolean;
  enableExpiryAlert: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

