/**
 * Ooredoo Tunisia SMS Provider
 * SMS services for Tunisia
 * https://www.ooredoo.tn
 */

import { z } from 'zod';
import type {
  SmsProvider,
  SmsRequest,
  SmsResponse,
  SmsBulkResponse,
} from '../../types';

// Ooredoo Configuration Schema
export const OoredooConfigSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  senderId: z.string().max(11, 'Sender ID must be max 11 characters'),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export type OoredooConfig = z.infer<typeof OoredooConfigSchema>;

const API_URLS = {
  sandbox: 'https://test.ooredoo.tn/sms/api',
  production: 'https://sms.ooredoo.tn/api/v1',
};

export class OoredooProvider implements SmsProvider {
  readonly id = 'ooredoo';
  readonly name = 'Ooredoo Tunisia';
  readonly category = 'sms' as const;
  readonly description = 'Service SMS professionnel Ooredoo Tunisie';
  readonly logo = '/integrations/ooredoo.png';
  readonly website = 'https://www.ooredoo.tn';
  readonly configSchema = OoredooConfigSchema;

  // Features
  readonly supportsBulk = true;
  readonly supportsScheduling = true;
  readonly maxMessageLength = 160; // Standard SMS

  private config: OoredooConfig | null = null;
  private baseUrl: string = API_URLS.production;

  async initialize(config: OoredooConfig): Promise<void> {
    const validated = OoredooConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = OoredooConfigSchema.parse(credentials);
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
        message: `Connexion Ooredoo réussie. Solde: ${balance.balance} ${balance.currency}`
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
    const formattedNumbers = recipients.map(num => this.formatPhoneNumber(num));

    try {
      const payload = {
        username: this.config.username,
        password: this.config.password,
        sender: request.from || this.config.senderId,
        recipient: formattedNumbers[0],
        message: request.message,
        scheduled_at: request.scheduledAt?.toISOString(),
      };

      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        return {
          success: false,
          messageId: '',
          status: 'failed',
          to: formattedNumbers[0],
          errorCode: data.error_code,
          errorMessage: data.message || 'Échec envoi SMS',
          rawResponse: data,
        };
      }

      return {
        success: true,
        messageId: data.message_id,
        status: request.scheduledAt ? 'scheduled' : 'sent',
        to: formattedNumbers[0],
        cost: data.cost,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        to: formattedNumbers[0],
        errorMessage: `Ooredoo Error: ${error}`,
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

    // Ooredoo supports bulk sending with multiple recipients
    for (const request of requests) {
      const recipients = Array.isArray(request.to) ? request.to : [request.to];

      try {
        const payload = {
          username: this.config.username,
          password: this.config.password,
          sender: request.from || this.config.senderId,
          recipients: recipients.map(num => this.formatPhoneNumber(num)),
          message: request.message,
          scheduled_at: request.scheduledAt?.toISOString(),
        };

        const response = await fetch(`${this.baseUrl}/send-bulk`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          for (const recipient of recipients) {
            results.push({
              success: true,
              messageId: data.batch_id,
              status: 'sent',
              to: this.formatPhoneNumber(recipient),
              rawResponse: data,
            });
            totalSent++;
          }
        } else {
          for (const recipient of recipients) {
            results.push({
              success: false,
              messageId: '',
              status: 'failed',
              to: this.formatPhoneNumber(recipient),
              errorMessage: data.message,
              rawResponse: data,
            });
            totalFailed++;
          }
        }
      } catch (error) {
        for (const recipient of recipients) {
          results.push({
            success: false,
            messageId: '',
            status: 'failed',
            to: this.formatPhoneNumber(recipient),
            errorMessage: `Error: ${error}`,
          });
          totalFailed++;
        }
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
      const response = await fetch(`${this.baseUrl}/status/${messageId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      return {
        success: data.status === 'delivered',
        messageId,
        status: this.mapStatus(data.status),
        to: data.recipient,
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

    const response = await fetch(`${this.baseUrl}/balance`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get balance');
    }

    return {
      balance: data.balance || 0,
      currency: 'TND',
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Add Tunisia country code if not present
    if (cleaned.startsWith('216')) {
      return cleaned;
    }
    if (cleaned.startsWith('00216')) {
      return cleaned.substring(2);
    }
    if (cleaned.startsWith('+216')) {
      return cleaned.substring(1);
    }
    // Assume Tunisian number if starts with valid prefix
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
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }
}

export const createOoredooProvider = () => new OoredooProvider();
