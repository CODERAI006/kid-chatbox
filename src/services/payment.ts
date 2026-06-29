/**
 * Admin — payment settings & payment request review
 */

import { apiClient } from './api';
import type { AdminPaymentRequest, PaymentRequestSummary, PaymentSettings } from '@/types/payment';

export const paymentApi = {
  getMyRequests: async (): Promise<{ success: boolean; requests: PaymentRequestSummary[] }> => {
    const res = await apiClient.get('/payment-requests/mine');
    return res.data;
  },

  submitProof: async (
    planId: string,
    screenshot: File,
    transactionRef?: string
  ): Promise<{ success: boolean; message: string }> => {
    const form = new FormData();
    form.append('planId', planId);
    form.append('screenshot', screenshot);
    if (transactionRef) form.append('transactionRef', transactionRef);
    const res = await apiClient.post('/payment-requests', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const paymentAdminApi = {
  getSettings: async (): Promise<{ success: boolean; settings: PaymentSettings & { qrImageUrl?: string | null } }> => {
    const res = await apiClient.get('/admin/payment-settings');
    return res.data;
  },

  updateSettings: async (payload: {
    enabled?: boolean;
    upiId?: string;
    phoneNumber?: string;
    payeeName?: string;
    instructions?: string;
  }): Promise<{ success: boolean; settings: PaymentSettings }> => {
    const res = await apiClient.put('/admin/payment-settings', payload);
    return res.data;
  },

  uploadQr: async (file: File): Promise<{ success: boolean; settings: PaymentSettings & { qrImageUrl?: string } }> => {
    const form = new FormData();
    form.append('qr', file);
    const res = await apiClient.post('/admin/payment-settings/qr', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  listRequests: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; requests: AdminPaymentRequest[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get('/admin/payment-requests', { params });
    return res.data;
  },

  approveRequest: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/admin/payment-requests/${id}/approve`);
    return res.data;
  },

  rejectRequest: async (id: string, adminNotes?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/admin/payment-requests/${id}/reject`, { adminNotes });
    return res.data;
  },
};
