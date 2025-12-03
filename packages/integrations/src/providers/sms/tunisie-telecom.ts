/**
 * Tunisie Telecom SMS Provider
 * SMS services for Tunisia
 * https://www.tunisietelecom.tn
 */

import { z } from 'zod';
import type {
  SmsProvider,
  SmsRequest,
  SmsResponse,
  SmsBulkResponse,
} from '../../types';

// Tunisie Telecom Configuration Schema
export const TunisieTelecomConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  apiSecret: z.string().min(1, 'API Secret is required'),
  senderId: z.string().max(11, 'Sender ID must be max 11 characters'),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export type TunisieTelecomConfig = z.infer<typeof TunisieTelecomConfigSchema>;

const API_URLS = {
  sandbox: 'https://sandbox.tunisietelecom.tn/sms/api/v2',
  production: 'https://sms.tunisietelecom.tn/api/v2',
};

export class TunisieTelecomProvider implements SmsProvider {
  readonly id = 'tunisie-telecom';
  readonly name = 'Tunisie Telecom';
  readonly category = 'sms' as const;
  readonly description = 'Service SMS professionnel Tunisie Telecom';
  readonly logo = '/integrations/tunisie-telecom.png';
  readonly website = 'https://www.tunisietelecom.tn';
  readonly configSchema = TunisieTelecomConfigSchema;

  // Features
  readonly supportsBulk = true;
  readonly supportsScheduling = true;
  readonly maxMessageLength = 160;

  private config: TunisieTelecomConfig | null = null;
  private baseUrl: string = API_URLS.production;

  async initialize(config: TunisieTelecomConfig): Promise<void> {
    const validated = TunisieTelecomConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = TunisieTelecomConfigSchema.parse(credentials);
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
      const balance = await this.getBalance();
      return {
        success: true,
        message: `Connexion Tunisie Telecom réussie. Solde: ${balance.balance} ${balance.currency}`
      };
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` };
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
  }

  async sendSms(request: SmsRequest): Promise<SmsResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    const formattedNumber = this.formatPhoneNumber(recipients[0]);

    try {
      const payload = {
        to: formattedNumber,
        from: request.from || this.config.senderId,
        text: request.message,
        send_at: request.scheduledAt?.toISOString(),
        callback_url: request.metadata?.callbackUrl,
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          messageId: '',
          status: 'failed',
          to: formattedNumber,
          errorCode: data.error?.code,
          errorMessage: data.error?.message || 'Échec envoi SMS',
          rawResponse: data,
        };
      }

      return {
        success: true,
        messageId: data.id,
        status: request.scheduledAt ? 'scheduled' : 'sent',
        to: formattedNumber,
        cost: data.cost,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        to: formattedNumber,
        errorMessage: `Tunisie Telecom Error: ${error}`,
      };
    }
  }

  async sendBulkSms(requests: SmsRequest[]): Promise<SmsBulkResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const results: SmsResponse[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Prepare bulk messages
    const messages = requests.flatMap(request => {
      const recipients = Array.isArray(request.to) ? request.to : [request.to];
      return recipients.map(recipient => ({
        to: this.formatPhoneNumber(recipient),
        from: request.from || this.config!.senderId,
        text: request.message,
        send_at: request.scheduledAt?.toISOString(),
      }));
    });

    try {
      const response = await fetch(`${this.baseUrl}/messages/bulk`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();

      if (response.ok && data.results) {
        for (const result of data.results) {
          const success = result.status === 'sent' || result.status === 'scheduled';
          results.push({
            success,
            messageId: result.id || '',
            status: success ? 'sent' : 'failed',
            to: result.to,
            errorMessage: result.error?.message,
            rawResponse: result,
          });
          if (success) totalSent++;
          else totalFailed++;
        }
      } else {
        // All failed
        for (const msg of messages) {
          results.push({
            success: false,
            messageId: '',
            status: 'failed',
            to: msg.to,
            errorMessage: data.error?.message || 'Bulk send failed',
            rawResponse: data,
          });
          totalFailed++;
        }
      }
    } catch (error) {
      for (const msg of messages) {
        results.push({
          success: false,
          messageId: '',
          status: 'failed',
          to: msg.to,
          errorMessage: `Error: ${error}`,
        });
        totalFailed++;
      }
    }

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      messages: results,
    };
  }

  async getMessageStatus(messageId: string): Promise<SmsResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      return {
        success: data.status === 'delivered',
        messageId,
        status: this.mapStatus(data.status),
        to: data.to,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        messageId,
        status: 'failed',
        to: '',
        errorMessage: `Error: ${error}`,
      };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const response = await fetch(`${this.baseUrl}/account/balance`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get balance');
    }

    return {
      balance: data.balance || 0,
      currency: 'TND',
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${this.config?.apiKey}:${this.config?.apiSecret}`)}`,
    };
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('216')) {
      return cleaned;
    }
    if (cleaned.startsWith('00216')) {
      return cleaned.substring(2);
    }
    if (cleaned.startsWith('+216')) {
      return cleaned.substring(1);
    }
    if (cleaned.length === 8) {
      return `216${cleaned}`;
    }

    return cleaned;
  }

  private mapStatus(status: string): SmsResponse['status'] {
    const statusMap: Record<string, SmsResponse['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      pending: 'pending',
      scheduled: 'scheduled',
      queued: 'pending',
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }
}

export const createTunisieTelecomProvider = () => new TunisieTelecomProvider();
