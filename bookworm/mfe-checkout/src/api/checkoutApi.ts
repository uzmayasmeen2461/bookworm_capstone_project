import { postAuth } from '../../../shared/src/apiClient';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'wallet';

export interface CreateOrderPayload {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  useGiftPoints?: boolean;
}

export interface OrderCreatedResponse {
  orderId: string;
  totalAmount: number;
  status: string;
}

export interface PaymentInitResponse {
  sessionToken: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentConfirmResponse {
  message: string;
  orderId: string;
  pointsEarned: number;
}

export const checkoutApi = {
  createOrder: (payload: CreateOrderPayload) =>
    postAuth<OrderCreatedResponse>('/orders', payload),

  initiatePayment: (orderId: string) =>
    postAuth<PaymentInitResponse>('/payment/initiate', { orderId }),

  confirmPayment: (orderId: string, sessionToken: string) =>
    postAuth<PaymentConfirmResponse>('/payment/confirm', { orderId, sessionToken }),
};
