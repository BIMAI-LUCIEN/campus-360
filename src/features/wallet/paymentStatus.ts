// Payment status as the app shows it. Only the server can say "success": any
// unknown or missing value is "pending", never a success.

export type PaymentStatus = 'pending' | 'success' | 'failed';

export const mapServerPaymentStatus = (raw: unknown): PaymentStatus => {
  if (raw === 'success' || raw === 'completed') return 'success';
  if (raw === 'failed') return 'failed';
  return 'pending';
};
