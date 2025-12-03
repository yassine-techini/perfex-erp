/**
 * Flouci Payment Provider
 * Tunisian mobile payment solution
 * https://flouci.com
 */

import { z } from 'zod';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentWebhookPayload,
} from '../../types';

// Flouci Configuration Schema
export const FlouciConfigSchema = z.object({
  appToken: z.string().min(1, 'App Token is required'),
  appSecret: z.string().min(1, 'App Secret is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export type FlouciConfig = z.infer<typeof FlouciConfigSchema>;

const API_URLS = {
  sandbox: 'https://developers.flouci.com/api',
  production: 'https://api.flouci.com/v1',
};

export class FlouciProvider implements PaymentProvider {
  readonly id = 'flouci';
  readonly name = 'Flouci';
  readonly category = 'payment' as const;
  readonly description = 'Paiement mobile simple et rapide en Tunisie';
  readonly logo = '/integrations/flouci.png';
  readonly website = 'https://flouci.com';
  readonly configSchema = FlouciConfigSchema;

  // Features
  readonly supportsRefund = true;
  readonly supportsPartialRefund = true;
  readonly supportsRecurring = false;

  private config: FlouciConfig | null = null;
  private baseUrl: string = API_URLS.sandbox;

  async initialize(config: FlouciConfig): Promise<void> {
    const validated = FlouciConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = FlouciConfigSchema.parse(credentials);
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
      const response = await fetch(`${this.baseUrl}/verify-connection`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          app_token: this.config.appToken,
          app_secret: this.config.appSecret,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Connexion Flouci réussie' };
      }

      return { success: false, message: `Erreur Flouci: ${response.status}` };
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
        app_token: this.config.appToken,
        app_secret: this.config.appSecret,
        amount: request.amount, // Amount in millimes
        accept_card: true,
        session_timeout_secs: 1800, // 30 minutes
        success_link: request.returnUrl,
        fail_link: request.cancelUrl || request.returnUrl,
        developer_tracking_id: request.orderId,
      };

      const response = await fetch(`${this.baseUrl}/generate_payment`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.result?.success) {
        return {
          success: false,
          transactionId: '',
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          errorCode: data.error_code,
          errorMessage: data.result?.message || 'Payment initiation failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.result.payment_id,
        paymentUrl: data.result.link,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        providerRef: data.result.payment_id,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        errorMessage: `Flouci Error: ${error}`,
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/verify_payment/${transactionId}`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'apppublic': this.config.appToken,
          'appsecret': this.config.appSecret,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get payment status');
      }

      const isSuccess = data.result?.status === 'SUCCESS';

      return {
        success: isSuccess,
        transactionId: data.result?.payment_id || transactionId,
        status: this.mapStatus(data.result?.status),
        amount: data.result?.amount || 0,
        currency: 'TND',
        providerRef: data.result?.payment_id,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: 0,
        currency: 'TND',
        errorMessage: `Flouci Error: ${error}`,
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const payload: Record<string, unknown> = {
        app_token: this.config.appToken,
        app_secret: this.config.appSecret,
        payment_id: transactionId,
      };

      if (amount) {
        payload.amount = amount; // Partial refund
      }

      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.result?.success) {
        return {
          success: false,
          transactionId,
          status: 'failed',
          amount: amount || 0,
          currency: 'TND',
          errorCode: data.error_code,
          errorMessage: data.result?.message || 'Refund failed',
          rawResponse: data,
        };
      }

      return {
        success: true,
        transactionId: data.result.refund_id || transactionId,
        status: 'refunded',
        amount: data.result.amount || amount || 0,
        currency: 'TND',
        providerRef: data.result.refund_id,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        status: 'failed',
        amount: amount || 0,
        currency: 'TND',
        errorMessage: `Flouci Refund Error: ${error}`,
      };
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentWebhookPayload> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const data = payload as Record<string, unknown>;

    // Flouci uses a simple token-based verification
    if (data.app_token !== this.config.appToken) {
      throw new Error('Invalid webhook app token');
    }

    return {
      transactionId: data.payment_id as string,
      status: this.mapStatus(data.status as string),
      amount: data.amount as number,
      orderId: data.developer_tracking_id as string,
      timestamp: new Date(),
      signature,
      rawPayload: payload,
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private mapStatus(status: string): PaymentResponse['status'] {
    const statusMap: Record<string, PaymentResponse['status']> = {
      SUCCESS: 'completed',
      PENDING: 'pending',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
    };
    return statusMap[status?.toUpperCase()] || 'pending';
  }
}

export const createFlouciProvider = () => new FlouciProvider();
