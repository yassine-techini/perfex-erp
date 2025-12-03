/**
 * Konnect Payment Provider
 * Tunisian payment gateway by Konnect Network
 * https://konnect.network
 */

import { z } from 'zod';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentWebhookPayload,
} from '../../types';

// Konnect Configuration Schema
export const KonnectConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  receiverWalletId: z.string().min(1, 'Receiver Wallet ID is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export type KonnectConfig = z.infer<typeof KonnectConfigSchema>;

const API_URLS = {
  sandbox: 'https://api.preprod.konnect.network/api/v2',
  production: 'https://api.konnect.network/api/v2',
};

export class KonnectProvider implements PaymentProvider {
  readonly id = 'konnect';
  readonly name = 'Konnect';
  readonly category = 'payment' as const;
  readonly description = 'Passerelle de paiement tunisienne multi-canaux';
  readonly logo = '/integrations/konnect.png';
  readonly website = 'https://konnect.network';
  readonly configSchema = KonnectConfigSchema;

  // Features
  readonly supportsRefund = true;
  readonly supportsPartialRefund = true;
  readonly supportsRecurring = true;

  private config: KonnectConfig | null = null;
  private baseUrl: string = API_URLS.sandbox;

  async initialize(config: KonnectConfig): Promise<void> {
    const validated = KonnectConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = KonnectConfigSchema.parse(credentials);
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
      const response = await fetch(`${this.baseUrl}/wallets/${this.config.receiverWalletId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true, message: 'Connexion Konnect réussie' };
      }

      const data = await response.json();
      return { success: false, message: `Erreur Konnect: ${data.message || response.status}` };
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
        receiverWalletId: this.config.receiverWalletId,
        amount: request.amount, // Amount in millimes
        token: 'TND',
        type: 'immediate',
        description: request.description,
        acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
        lifespan: 30, // 30 minutes
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: request.customerName?.split(' ')[0] || '',
        lastName: request.customerName?.split(' ').slice(1).join(' ') || '',
        phoneNumber: request.customerPhone,
        email: request.customerEmail,
        orderId: request.orderId,
        webhook: request.webhookUrl,
        silentWebhook: true,
        successUrl: request.returnUrl,
        failUrl: request.cancelUrl || request.returnUrl,
        theme: 'light',
      };

      const response = await fetch(`${this.baseUrl}/payments/init-payment`, {
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
          errorCode: data.errorCode,
          errorMessage: data.message || 'Payment initiation failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.paymentRef,
        paymentUrl: data.payUrl,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        providerRef: data.paymentRef,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        errorMessage: `Konnect Error: ${error}`,
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
        success: data.payment?.status === 'completed',
        transactionId: data.payment?.paymentRef || transactionId,
        status: this.mapStatus(data.payment?.status),
        amount: data.payment?.amount || 0,
        currency: 'TND',
        providerRef: data.payment?.paymentRef,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `Konnect Error: ${error}`,
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const payload: Record<string, unknown> = {
        paymentRef: transactionId,
      };

      if (amount) {
        payload.amount = amount; // Partial refund
      }

      const response = await fetch(`${this.baseUrl}/payments/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          transactionId,
          status: 'failed',
          amount: amount || 0,
          currency: 'TND',
          errorCode: data.errorCode,
          errorMessage: data.message || 'Refund failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.refundRef || transactionId,
        status: 'refunded',
        amount: data.amount || amount || 0,
        currency: 'TND',
        providerRef: data.refundRef,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: amount || 0,
        currency: 'TND',
        errorMessage: `Konnect Refund Error: ${error}`,
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

    const payment = data.payment as Record<string, unknown>;

    return {
      transactionId: payment.paymentRef as string,
      status: this.mapStatus(payment.status as string),
      amount: payment.amount as number,
      orderId: payment.orderId as string,
      timestamp: new Date(payment.completedAt as string || Date.now()),
      signature,
      rawPayload: payload,
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config?.apiKey || '',
    };
  }

  private mapStatus(status: string): PaymentResponse['status'] {
    const statusMap: Record<string, PaymentResponse['status']> = {
      pending: 'pending',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  private async computeSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config?.apiKey || '');
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

export const createKonnectProvider = () => new KonnectProvider();
