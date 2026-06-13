import { Product } from './types';

// Format currency as UGX Shillings
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
    .replace('UGX', 'Shs') // Use local Shs style commonly preferred in Kla cosmetics shops
    + ' /-';
}

// Check if a product is out of stock
export function isOutOfStock(product: Product): boolean {
  return product.quantity <= 0;
}

// Check if a product is low in stock
export function isLowStock(product: Product): boolean {
  return product.quantity > 0 && product.quantity <= product.safeLevel;
}

// Check if product is expired or expiring soon (within 30 days)
export function getExpiryStatus(expiryDateStr: string): 'expired' | 'expiring-soon' | 'safe' {
  const expiry = new Date(expiryDateStr);
  const today = new Date();
  
  // Reset time portions for pure date comparison
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'expired';
  } else if (diffDays <= 30) {
    return 'expiring-soon';
  }
  return 'safe';
}

// Generate unique invoice number
export function generateInvoiceNumber(existingCount: number): string {
  const nextNum = existingCount + 101;
  return `EB-2026-${nextNum}`;
}
