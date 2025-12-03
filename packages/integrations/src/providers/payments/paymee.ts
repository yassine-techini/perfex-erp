/**
 * Paymee Payment Provider
 * Tunisian payment gateway
 * https://paymee.tn
 */

import { z } from 'zod';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentWebhookPayload,
} from '../../types';

// Paymee Configuration Schema
export const PaymeeConfigSchema = z.object({
  apiToken: z.string().min(1, 'API Token is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export type PaymeeConfig = z.infer<typeof PaymeeConfigSchema>;

const API_URLS = {
  sandbox: 'https://sandbox.paymee.tn/api/v2',
  production: 'https://app.paymee.tn/api/v2',
};

export class PaymeeProvider implements PaymentProvider {
  readonly id = 'paymee';
  readonly name = 'Paymee';
  readonly category = 'payment' as const;
  readonly description = 'Passerelle de paiement en ligne tunisienne';
  readonly logo = '/integrations/paymee.png';
  readonly website = 'https://paymee.tn';
  readonly configSchema = PaymeeConfigSchema;

  // Features
  readonly supportsRefund = true;
  readonly supportsPartialRefund = false;
  readonly supportsRecurring = false;

  private config: PaymeeConfig | null = null;
  private baseUrl: string = API_URLS.sandbox;

  async initialize(config: PaymeeConfig): Promise<void> {
    const validated = PaymeeConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = PaymeeConfigSchema.parse(credentials);
      await this.initialize(config);
      const result = await this.testConnection();
      return result.success;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: 'Provider not initialized' };
    }

    try {
      // Test by getting account info
      const response = await fetch(`${this.baseUrl}/payments/check`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token: 'test' }),
      });

      // A 4xx error with specific message means auth works
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Authentification Paymee échouée' };
      }

      return { success: true, message: 'Connexion Paymee réussie' };
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` };
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      // Convert millimes to dinars (Paymee uses dinars)
      const amountInDinars = request.amount / 1000;

      const payload = {
        vendor: this.config.vendorId,
        amount: amountInDinars,
        note: request.description,
        order_id: request.orderId,
        first_name: request.customerName?.split(' ')[0] || 'Client',
        last_name: request.customerName?.split(' ').slice(1).join(' ') || '',
        email: request.customerEmail || '',
        phone: request.customerPhone || '',
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl || request.returnUrl,
        webhook_url: request.webhookUrl,
      };

      const response = await fetch(`${this.baseUrl}/payments/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return {
          success: false,
          transactionId: '',
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          errorCode: data.code?.toString(),
          errorMessage: data.message || 'Payment initiation failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.data.token,
        paymentUrl: data.data.payUrl,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        providerRef: data.data.token,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        errorMessage: `Paymee Error: ${error}`,
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}/check`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get payment status');
      }

      // Convert dinars back to millimes
      const amountInMillimes = (data.data?.amount || 0) * 1000;

      return {
        success: data.data?.payment_status === true,
        transactionId: data.data?.token || transactionId,
        status: data.data?.payment_status ? 'completed' : 'pending',
        amount: amountInMillimes,
        currency: 'TND',
        providerRef: data.data?.transaction_id,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `Paymee Error: ${error}`,
      };
    }
  }

  async refundPayment(transactionId: string, _amount?: number): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          token: transactionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return {
          success: false,
          transactionId,
          status: 'failed',
          amount: 0,
          currency: 'TND',
          errorCode: data.code?.toString(),
          errorMessage: data.message || 'Refund failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.data?.refund_id || transactionId,
        status: 'refunded',
        amount: (data.data?.amount || 0) * 1000, // Convert to millimes
        currency: 'TND',
        providerRef: data.data?.refund_id,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `Paymee Refund Error: ${error}`,
      };
    }
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<PaymentWebhookPayload> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const data = payload as Record<string, unknown>;

    // Paymee sends payment info directly
    return {
      transactionId: data.token as string,
      status: data.payment_status ? 'completed' : 'failed',
      amount: ((data.amount as number) || 0) * 1000, // Convert to millimes
      orderId: data.order_id as string,
      timestamp: new Date(data.received_at as string || Date.now()),
      rawPayload: payload,
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.config?.apiToken}`,
    };
  }
}

export const createPaymeeProvider = () => new PaymeeProvider();
