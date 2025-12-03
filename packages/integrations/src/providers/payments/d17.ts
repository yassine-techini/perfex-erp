/**
 * D17 Payment Provider
 * Tunisian mobile payment solution by Banque de Tunisie
 * https://www.d17.tn
 */

import { z } from 'zod';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentWebhookPayload,
} from '../../types';

// D17 Configuration Schema
export const D17ConfigSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  secretKey: z.string().min(1, 'Secret Key is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export type D17Config = z.infer<typeof D17ConfigSchema>;

const API_URLS = {
  sandbox: 'https://sandbox.d17.tn/api/v1',
  production: 'https://api.d17.tn/api/v1',
};

export class D17Provider implements PaymentProvider {
  readonly id = 'd17';
  readonly name = 'D17';
  readonly category = 'payment' as const;
  readonly description = 'Solution de paiement mobile tunisienne par Banque de Tunisie';
  readonly logo = '/integrations/d17.png';
  readonly website = 'https://www.d17.tn';
  readonly configSchema = D17ConfigSchema;

  // Features
  readonly supportsRefund = true;
  readonly supportsPartialRefund = false;
  readonly supportsRecurring = false;

  private config: D17Config | null = null;
  private baseUrl: string = API_URLS.sandbox;

  async initialize(config: D17Config): Promise<void> {
    const validated = D17ConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = D17ConfigSchema.parse(credentials);
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
      const response = await fetch(`${this.baseUrl}/merchant/info`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true, message: 'Connexion D17 réussie' };
      }

      return { success: false, message: `Erreur D17: ${response.status}` };
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
      const payload = {
        merchant_id: this.config.merchantId,
        amount: request.amount, // Amount in millimes
        currency: request.currency,
        order_id: request.orderId,
        description: request.description,
        customer_phone: request.customerPhone,
        customer_email: request.customerEmail,
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        webhook_url: request.webhookUrl,
        metadata: request.metadata,
      };

      const response = await fetch(`${this.baseUrl}/payments/initiate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          transactionId: '',
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          errorCode: data.error_code,
          errorMessage: data.message || 'Payment initiation failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.transaction_id,
        paymentUrl: data.payment_url,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        providerRef: data.reference,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        errorMessage: `D17 Error: ${error}`,
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get payment status');
      }

      return {
        success: data.status === 'completed',
        transactionId: data.transaction_id,
        status: this.mapStatus(data.status),
        amount: data.amount,
        currency: data.currency,
        providerRef: data.reference,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `D17 Error: ${error}`,
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
          transaction_id: transactionId,
          // D17 doesn't support partial refunds
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          transactionId,
          status: 'failed',
          amount: 0,
          currency: 'TND',
          errorCode: data.error_code,
          errorMessage: data.message || 'Refund failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.refund_id,
        status: 'refunded',
        amount: data.amount,
        currency: data.currency,
        providerRef: data.reference,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `D17 Refund Error: ${error}`,
      };
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentWebhookPayload> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    // Verify signature using HMAC-SHA256
    const data = payload as Record<string, unknown>;
    const computedSignature = await this.computeSignature(JSON.stringify(payload));

    if (computedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    return {
      transactionId: data.transaction_id as string,
      status: this.mapStatus(data.status as string),
      amount: data.amount as number,
      orderId: data.order_id as string,
      timestamp: new Date(data.timestamp as string),
      signature,
      rawPayload: payload,
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config?.apiKey}`,
      'X-Merchant-Id': this.config?.merchantId || '',
    };
  }

  private mapStatus(status: string): PaymentResponse['status'] {
    const statusMap: Record<string, PaymentResponse['status']> = {
      pending: 'pending',
      processing: 'pending',
      completed: 'completed',
      success: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  }

  private async computeSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config?.secretKey || '');
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const createD17Provider = () => new D17Provider();
