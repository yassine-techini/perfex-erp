/**
 * Aramex Tunisia Shipping Provider
 * International and local shipping services
 * https://www.aramex.com
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

// Aramex Configuration Schema
export const AramexConfigSchema = z.object({
  accountNumber: z.string().min(1, 'Account Number is required'),
  accountPin: z.string().min(1, 'Account PIN is required'),
  accountEntity: z.string().default('TUN'),
  accountCountryCode: z.string().default('TN'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export type AramexConfig = z.infer<typeof AramexConfigSchema>;

const API_URLS = {
  sandbox: 'https://ws.dev.aramex.net/ShippingAPI.V2',
  production: 'https://ws.aramex.net/ShippingAPI.V2',
};

// Aramex service types
export const ARAMEX_SERVICES = {
  DOM: 'Domestic Express',
  OND: 'On Demand',
  PDX: 'Priority Document Express',
  PPX: 'Priority Parcel Express',
  PLX: 'Priority Letter Express',
  DDX: 'Deferred Document Express',
  DPX: 'Deferred Parcel Express',
  GDX: 'Ground Document Express',
  GPX: 'Ground Parcel Express',
  EPX: 'Economy Parcel Express',
};

export class AramexProvider implements ShippingProvider {
  readonly id = 'aramex';
  readonly name = 'Aramex Tunisia';
  readonly category = 'shipping' as const;
  readonly description = 'Service de livraison express national et international';
  readonly logo = '/integrations/aramex.png';
  readonly website = 'https://www.aramex.com';
  readonly configSchema = AramexConfigSchema;

  // Features
  readonly supportsCashOnDelivery = true;
  readonly supportsInsurance = true;
  readonly supportsPickup = true;
  readonly availableServices = Object.keys(ARAMEX_SERVICES);

  private config: AramexConfig | null = null;
  private baseUrl: string = API_URLS.production;

  async initialize(config: AramexConfig): Promise<void> {
    const validated = AramexConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = AramexConfigSchema.parse(credentials);
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
      // Test by fetching a dummy rate
      const response = await fetch(`${this.baseUrl}/RateCalculator/Service.asmx`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: this.buildSoapEnvelope('CalculateRate', this.getTestPayload()),
      });

      if (response.ok) {
        return { success: true, message: 'Connexion Aramex réussie' };
      }

      return { success: false, message: `Erreur Aramex: ${response.status}` };
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
      for (const serviceType of this.availableServices) {
        const payload = this.buildRatePayload(request, serviceType);

        const response = await fetch(`${this.baseUrl}/RateCalculator/Service.asmx`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: this.buildSoapEnvelope('CalculateRate', payload),
        });

        if (response.ok) {
          const data = await this.parseSoapResponse(await response.text());

          if (data.TotalAmount) {
            rates.push({
              serviceType,
              serviceName: ARAMEX_SERVICES[serviceType as keyof typeof ARAMEX_SERVICES] || serviceType,
              price: data.TotalAmount.Value * 1000, // Convert to millimes
              currency: 'TND',
              estimatedDays: this.getEstimatedDays(serviceType),
              carrier: 'Aramex',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Aramex rates:', error);
    }

    return rates;
  }

  async createShipment(request: ShippingRequest): Promise<ShippingResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const payload = this.buildShipmentPayload(request);

      const response = await fetch(`${this.baseUrl}/Shipping/Service.asmx`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: this.buildSoapEnvelope('CreateShipments', payload),
      });

      const text = await response.text();
      const data = await this.parseSoapResponse(text);

      if (!response.ok || data.HasErrors) {
        return {
          success: false,
          shipmentId: '',
          trackingNumber: '',
          status: 'failed',
          errorCode: data.Notifications?.[0]?.Code,
          errorMessage: data.Notifications?.[0]?.Message || 'Échec création expédition',
          rawResponse: data,
        };
      }

      const shipment = data.Shipments?.[0];

      return {
        success: true,
        shipmentId: shipment?.ID || '',
        trackingNumber: shipment?.ShipmentNumber || '',
        status: 'created',
        labelUrl: shipment?.ShipmentLabel?.LabelURL,
        estimatedDelivery: this.calculateEstimatedDelivery(request.serviceType),
        cost: shipment?.TotalAmount?.Value * 1000,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        shipmentId: '',
        trackingNumber: '',
        status: 'failed',
        errorMessage: `Aramex Error: ${error}`,
      };
    }
  }

  async getShipmentStatus(shipmentId: string): Promise<ShippingResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      const tracking = await this.trackShipment(shipmentId);

      return {
        success: tracking.success,
        shipmentId,
        trackingNumber: tracking.trackingNumber,
        status: tracking.status,
        estimatedDelivery: tracking.estimatedDelivery,
        rawResponse: tracking,
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
      const payload = {
        Shipments: [{ ID: '', Reference: trackingNumber }],
      };

      const response = await fetch(`${this.baseUrl}/Tracking/Service.asmx`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: this.buildSoapEnvelope('TrackShipments', payload),
      });

      const text = await response.text();
      const data = await this.parseSoapResponse(text);

      const tracking = data.TrackingResults?.[0];

      const events: TrackingEvent[] = (tracking?.Value || []).map((event: { UpdateDateTime: string | number | Date; UpdateCode: string; UpdateDescription: string; UpdateLocation: string; }) => ({
        timestamp: new Date(event.UpdateDateTime),
        status: event.UpdateCode,
        description: event.UpdateDescription,
        location: event.UpdateLocation,
      }));

      return {
        success: true,
        trackingNumber,
        status: this.mapTrackingStatus(tracking?.Value?.[0]?.UpdateCode),
        events,
        estimatedDelivery: tracking?.EstimatedDeliveryDate ? new Date(tracking.EstimatedDeliveryDate) : undefined,
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
      const payload = {
        Shipments: [shipmentId],
      };

      const response = await fetch(`${this.baseUrl}/Shipping/Service.asmx`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: this.buildSoapEnvelope('CancelPickup', payload),
      });

      const text = await response.text();
      const data = await this.parseSoapResponse(text);

      if (data.HasErrors) {
        return {
          success: false,
          message: data.Notifications?.[0]?.Message || 'Annulation échouée',
        };
      }

      return { success: true, message: 'Expédition annulée' };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  async printLabel(shipmentId: string): Promise<{ labelUrl: string; format: string }> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const payload = {
      ShipmentNumber: shipmentId,
      ProductGroup: 'EXP',
      OriginEntity: this.config.accountEntity,
    };

    const response = await fetch(`${this.baseUrl}/Shipping/Service.asmx`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: this.buildSoapEnvelope('PrintLabel', payload),
    });

    const text = await response.text();
    const data = await this.parseSoapResponse(text);

    return {
      labelUrl: data.LabelURL || '',
      format: 'PDF',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    };
  }

  private getClientInfo(): Record<string, unknown> {
    return {
      AccountCountryCode: this.config?.accountCountryCode,
      AccountEntity: this.config?.accountEntity,
      AccountNumber: this.config?.accountNumber,
      AccountPin: this.config?.accountPin,
      UserName: this.config?.username,
      Password: this.config?.password,
      Version: 'v1.0',
    };
  }

  private buildSoapEnvelope(action: string, payload: Record<string, unknown>): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${action} xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        ${this.objectToXml(this.getClientInfo())}
      </ClientInfo>
      ${this.objectToXml(payload)}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
  }

  private objectToXml(obj: Record<string, unknown>, indent = ''): string {
    return Object.entries(obj)
      .map(([key, value]) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object' && !Array.isArray(value)) {
          return `${indent}<${key}>\n${this.objectToXml(value as Record<string, unknown>, indent + '  ')}${indent}</${key}>`;
        }
        if (Array.isArray(value)) {
          return value.map(item => `${indent}<${key}>\n${this.objectToXml(item as Record<string, unknown>, indent + '  ')}${indent}</${key}>`).join('\n');
        }
        return `${indent}<${key}>${value}</${key}>`;
      })
      .filter(Boolean)
      .join('\n');
  }

  private async parseSoapResponse(xml: string): Promise<Record<string, unknown>> {
    // Simple XML to JSON conversion (in production, use a proper XML parser)
    const result: Record<string, unknown> = {};
    // This is a simplified parser - in production use xml2js or similar
    const bodyMatch = xml.match(/<soap:Body>([\s\S]*?)<\/soap:Body>/);
    if (bodyMatch) {
      // Extract key values - this is simplified
      const hasErrors = xml.includes('<HasErrors>true</HasErrors>');
      result.HasErrors = hasErrors;

      const trackingMatch = xml.match(/<TrackingResults>([\s\S]*?)<\/TrackingResults>/);
      if (trackingMatch) {
        result.TrackingResults = [{ Value: [] }];
      }
    }
    return result;
  }

  private getTestPayload(): Record<string, unknown> {
    return {
      OriginAddress: {
        City: 'Tunis',
        CountryCode: 'TN',
      },
      DestinationAddress: {
        City: 'Tunis',
        CountryCode: 'TN',
      },
      ShipmentDetails: {
        Dimensions: { Length: 10, Width: 10, Height: 10, Unit: 'cm' },
        ActualWeight: { Value: 1, Unit: 'KG' },
        ProductGroup: 'DOM',
        ProductType: 'DOM',
        PaymentType: 'P',
      },
    };
  }

  private buildRatePayload(request: Omit<ShippingRequest, 'serviceType'>, serviceType: string): Record<string, unknown> {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0);

    return {
      OriginAddress: this.formatAddress(request.sender),
      DestinationAddress: this.formatAddress(request.recipient),
      ShipmentDetails: {
        Dimensions: {
          Length: request.packages[0]?.length || 10,
          Width: request.packages[0]?.width || 10,
          Height: request.packages[0]?.height || 10,
          Unit: 'cm',
        },
        ActualWeight: { Value: totalWeight, Unit: 'KG' },
        ProductGroup: serviceType.startsWith('D') ? 'DOM' : 'EXP',
        ProductType: serviceType,
        PaymentType: 'P',
        NumberOfPieces: request.packages.length,
      },
    };
  }

  private buildShipmentPayload(request: ShippingRequest): Record<string, unknown> {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const totalValue = request.packages.reduce((sum, pkg) => sum + (pkg.value || 0), 0);

    return {
      Shipments: [{
        Shipper: {
          Reference1: request.orderId,
          AccountNumber: this.config?.accountNumber,
          PartyAddress: this.formatAddress(request.sender),
          Contact: {
            PersonName: request.sender.name,
            PhoneNumber1: request.sender.phone,
            CellPhone: request.sender.phone,
            EmailAddress: request.sender.email,
          },
        },
        Consignee: {
          Reference1: request.orderId,
          PartyAddress: this.formatAddress(request.recipient),
          Contact: {
            PersonName: request.recipient.name,
            PhoneNumber1: request.recipient.phone,
            CellPhone: request.recipient.phone,
            EmailAddress: request.recipient.email,
          },
        },
        ShippingDateTime: new Date().toISOString(),
        DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        Comments: request.instructions,
        PickupLocation: 'Reception',
        Details: {
          Dimensions: {
            Length: request.packages[0]?.length || 10,
            Width: request.packages[0]?.width || 10,
            Height: request.packages[0]?.height || 10,
            Unit: 'cm',
          },
          ActualWeight: { Value: totalWeight, Unit: 'KG' },
          ProductGroup: request.serviceType.startsWith('D') ? 'DOM' : 'EXP',
          ProductType: request.serviceType,
          PaymentType: 'P',
          PaymentOptions: request.cashOnDelivery ? 'CASH' : '',
          Services: request.cashOnDelivery ? 'COD' : '',
          NumberOfPieces: request.packages.length,
          DescriptionOfGoods: request.packages[0]?.description || 'Goods',
          CustomsValueAmount: { Value: totalValue / 1000, CurrencyCode: 'TND' },
          CashOnDeliveryAmount: request.cashOnDelivery
            ? { Value: request.cashOnDelivery / 1000, CurrencyCode: 'TND' }
            : undefined,
        },
      }],
    };
  }

  private formatAddress(address: ShippingAddress): Record<string, string> {
    return {
      Line1: address.street,
      Line2: address.street2 || '',
      Line3: '',
      City: address.city,
      StateOrProvinceCode: address.state || '',
      PostCode: address.postalCode || '',
      CountryCode: address.country,
    };
  }

  private getEstimatedDays(serviceType: string): number {
    const estimates: Record<string, number> = {
      DOM: 1,
      OND: 1,
      PDX: 2,
      PPX: 2,
      PLX: 2,
      DDX: 3,
      DPX: 3,
      GDX: 5,
      GPX: 5,
      EPX: 7,
    };
    return estimates[serviceType] || 3;
  }

  private calculateEstimatedDelivery(serviceType: string): Date {
    const days = this.getEstimatedDays(serviceType);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private mapTrackingStatus(code: string): ShippingResponse['status'] {
    const statusMap: Record<string, ShippingResponse['status']> = {
      SH001: 'created',
      SH002: 'picked_up',
      SH003: 'in_transit',
      SH004: 'in_transit',
      SH005: 'out_for_delivery',
      SH006: 'delivered',
      SH007: 'failed',
      SH008: 'returned',
    };
    return statusMap[code] || 'in_transit';
  }
}

export const createAramexProvider = () => new AramexProvider();
