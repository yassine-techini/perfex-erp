/**
 * Livrili Shipping Provider
 * Local delivery service in Tunisia
 * https://livrili.tn
 */

import { z } from 'zod';
import type {
  ShippingProvider,
  ShippingRequest,
  ShippingResponse,
  ShippingRate,
  ShippingAddress,
  TrackingResponse,
  TrackingEvent,
} from '../../types';

// Livrili Configuration Schema
export const LivriliConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export type LivriliConfig = z.infer<typeof LivriliConfigSchema>;

const API_URLS = {
  sandbox: 'https://sandbox.livrili.tn/api/v1',
  production: 'https://api.livrili.tn/api/v1',
};

// Livrili service types
export const LIVRILI_SERVICES = {
  standard: 'Livraison Standard (24-48h)',
  express: 'Livraison Express (même jour)',
  point_relais: 'Point Relais',
};

// Tunisian governorates
export const GOVERNORATES = {
  tunis: 'Tunis',
  ariana: 'Ariana',
  ben_arous: 'Ben Arous',
  manouba: 'Manouba',
  nabeul: 'Nabeul',
  zaghouan: 'Zaghouan',
  bizerte: 'Bizerte',
  beja: 'Béja',
  jendouba: 'Jendouba',
  kef: 'Le Kef',
  siliana: 'Siliana',
  sousse: 'Sousse',
  monastir: 'Monastir',
  mahdia: 'Mahdia',
  sfax: 'Sfax',
  kairouan: 'Kairouan',
  kasserine: 'Kasserine',
  sidi_bouzid: 'Sidi Bouzid',
  gabes: 'Gabès',
  medenine: 'Médenine',
  tataouine: 'Tataouine',
  gafsa: 'Gafsa',
  tozeur: 'Tozeur',
  kebili: 'Kébili',
};

export class LivriliProvider implements ShippingProvider {
  readonly id = 'livrili';
  readonly name = 'Livrili';
  readonly category = 'shipping' as const;
  readonly description = 'Service de livraison local en Tunisie avec paiement à la livraison';
  readonly logo = '/integrations/livrili.png';
  readonly website = 'https://livrili.tn';
  readonly configSchema = LivriliConfigSchema;

  // Features
  readonly supportsCashOnDelivery = true;
  readonly supportsInsurance = false;
  readonly supportsPickup = true;
  readonly availableServices = Object.keys(LIVRILI_SERVICES);

  private config: LivriliConfig | null = null;
  private baseUrl: string = API_URLS.production;

  async initialize(config: LivriliConfig): Promise<void> {
    const validated = LivriliConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = LivriliConfigSchema.parse(credentials);
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
      const response = await fetch(`${this.baseUrl}/stores/${this.config.storeId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true, message: 'Connexion Livrili réussie' };
      }

      return { success: false, message: `Erreur Livrili: ${response.status}` };
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` };
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
  }

  async getRates(request: Omit<ShippingRequest, 'serviceType'>): Promise<ShippingRate[]> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const rates: ShippingRate[] = [];

    try {
      const payload = {
        origin_governorate: this.mapGovernorate(request.sender.state || request.sender.city),
        destination_governorate: this.mapGovernorate(request.recipient.state || request.recipient.city),
        weight: request.packages.reduce((sum, pkg) => sum + pkg.weight, 0),
        cod_amount: 0,
      };

      const response = await fetch(`${this.baseUrl}/rates/calculate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.rates) {
        for (const rate of data.rates) {
          rates.push({
            serviceType: rate.service_type,
            serviceName: LIVRILI_SERVICES[rate.service_type as keyof typeof LIVRILI_SERVICES] || rate.service_type,
            price: rate.price * 1000, // Convert to millimes
            currency: 'TND',
            estimatedDays: rate.estimated_days,
            carrier: 'Livrili',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Livrili rates:', error);
    }

    // If API fails, return default rates
    if (rates.length === 0) {
      rates.push(
        {
          serviceType: 'standard',
          serviceName: LIVRILI_SERVICES.standard,
          price: 7000, // 7 TND
          currency: 'TND',
          estimatedDays: 2,
          carrier: 'Livrili',
        },
        {
          serviceType: 'express',
          serviceName: LIVRILI_SERVICES.express,
          price: 12000, // 12 TND
          currency: 'TND',
          estimatedDays: 1,
          carrier: 'Livrili',
        }
      );
    }

    return rates;
  }

  async createShipment(request: ShippingRequest): Promise<ShippingResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const payload = {
        store_id: this.config.storeId,
        order_reference: request.orderId,
        service_type: request.serviceType,

        // Sender (Pickup)
        pickup_address: {
          name: request.sender.name,
          phone: this.formatPhoneNumber(request.sender.phone),
          address: request.sender.street,
          city: request.sender.city,
          governorate: this.mapGovernorate(request.sender.state || request.sender.city),
        },

        // Recipient
        delivery_address: {
          name: request.recipient.name,
          phone: this.formatPhoneNumber(request.recipient.phone),
          phone2: request.recipient.email, // Use email field for secondary phone
          address: request.recipient.street,
          city: request.recipient.city,
          governorate: this.mapGovernorate(request.recipient.state || request.recipient.city),
        },

        // Package details
        package: {
          weight: request.packages.reduce((sum, pkg) => sum + pkg.weight, 0),
          description: request.packages[0]?.description || 'Colis',
          quantity: request.packages.length,
        },

        // COD
        cod_amount: request.cashOnDelivery ? request.cashOnDelivery / 1000 : 0, // Convert to dinars

        // Notes
        notes: request.instructions,

        // Metadata
        metadata: request.metadata,
      };

      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          shipmentId: '',
          trackingNumber: '',
          status: 'failed',
          errorCode: data.error_code,
          errorMessage: data.message || 'Échec création expédition',
          rawResponse: data,
        };
      }

      return {
        success: true,
        shipmentId: data.shipment.id,
        trackingNumber: data.shipment.tracking_number,
        status: 'created',
        labelUrl: data.shipment.label_url,
        estimatedDelivery: new Date(data.shipment.estimated_delivery),
        cost: data.shipment.shipping_cost * 1000, // Convert to millimes
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        shipmentId: '',
        trackingNumber: '',
        status: 'failed',
        errorMessage: `Livrili Error: ${error}`,
      };
    }
  }

  async getShipmentStatus(shipmentId: string): Promise<ShippingResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get shipment status');
      }

      return {
        success: data.shipment.status === 'delivered',
        shipmentId: data.shipment.id,
        trackingNumber: data.shipment.tracking_number,
        status: this.mapStatus(data.shipment.status),
        estimatedDelivery: data.shipment.estimated_delivery
          ? new Date(data.shipment.estimated_delivery)
          : undefined,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        shipmentId,
        trackingNumber: '',
        status: 'failed',
        errorMessage: `Error: ${error}`,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tracking/${trackingNumber}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Tracking failed');
      }

      const events: TrackingEvent[] = (data.history || []).map((event: { timestamp: string | number | Date; status: string; description: string; location: string; }) => ({
        timestamp: new Date(event.timestamp),
        status: event.status,
        description: event.description,
        location: event.location,
      }));

      return {
        success: true,
        trackingNumber,
        status: this.mapStatus(data.current_status),
        events,
        estimatedDelivery: data.estimated_delivery
          ? new Date(data.estimated_delivery)
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        trackingNumber,
        status: 'failed',
        events: [],
      };
    }
  }

  async cancelShipment(shipmentId: string): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Annulation échouée',
        };
      }

      return { success: true, message: 'Expédition annulée avec succès' };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  async printLabel(shipmentId: string): Promise<{ labelUrl: string; format: string }> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/label`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get label');
    }

    return {
      labelUrl: data.label_url,
      format: 'PDF',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config?.apiKey}`,
      'X-Store-Id': this.config?.storeId || '',
    };
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    // Ensure it starts with 216 (Tunisia)
    if (!cleaned.startsWith('216')) {
      if (cleaned.length === 8) {
        cleaned = `216${cleaned}`;
      }
    }

    return cleaned;
  }

  private mapGovernorate(location: string): string {
    // Try to match governorate
    const normalized = location.toLowerCase().replace(/[^a-z]/g, '');

    for (const [key, value] of Object.entries(GOVERNORATES)) {
      if (normalized.includes(key) || normalized.includes(value.toLowerCase().replace(/[^a-z]/g, ''))) {
        return key;
      }
    }

    // Default to Tunis if not found
    return 'tunis';
  }

  private mapStatus(status: string): ShippingResponse['status'] {
    const statusMap: Record<string, ShippingResponse['status']> = {
      pending: 'created',
      created: 'created',
      picked_up: 'picked_up',
      pickup: 'picked_up',
      in_transit: 'in_transit',
      transit: 'in_transit',
      out_for_delivery: 'out_for_delivery',
      delivering: 'out_for_delivery',
      delivered: 'delivered',
      failed: 'failed',
      returned: 'returned',
      cancelled: 'failed',
    };
    return statusMap[status?.toLowerCase()] || 'in_transit';
  }
}

export const createLivriliProvider = () => new LivriliProvider();
