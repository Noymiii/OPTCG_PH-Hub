// src/lib/market-utils.ts

// ✅ Updated Rate: Just 0.35
const JPY_TO_PHP_RATE = 0.35; 

export function calculateVariantPrice(jpyPrice: number) {
  if (!jpyPrice || jpyPrice === 0) return 0;

  // ✅ Calculation: Just Price * 0.35 (Rounded up to nearest whole number)
  let rawPhp = Math.ceil(jpyPrice * JPY_TO_PHP_RATE);
  
  // Optional: Keeps prices looking clean (e.g. 153 -> 160)
  // You can delete this line if you want exact values like 153.
  if (rawPhp > 50) rawPhp = Math.ceil(rawPhp / 10) * 10;
  
  return rawPhp;
}

export const formatCurrency = (amount: number) => {
  if (amount === 0) return "---";
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount);
};