/**
 * Payment / UPI types
 */

export interface PaymentConfig {
  enabled: boolean;
  upiId: string;
  phoneNumber: string;
  payeeName: string;
  qrImageUrl: string | null;
  instructions: string;
}

export interface PaymentSettings extends PaymentConfig {
  qrImagePath?: string | null;
}

export interface PaymentRequestSummary {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  transactionRef?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface AdminPaymentRequest extends PaymentRequestSummary {
  userId: string;
  userName: string;
  userEmail: string;
  screenshotUrl: string | null;
  reviewedBy?: string | null;
}
