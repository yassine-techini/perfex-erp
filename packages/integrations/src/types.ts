/**
 * Integration Types
 * Core types for all integration providers
 */

import { z } from 'zod';

// Provider categories
export type ProviderCategory = 'payment' | 'fiscal' | 'sms' | 'shipping' | 'messaging' | 'accounting';

// Provider status
export type ProviderStatus = 'active' | 'inactive' | 'error' | 'pending_setup';

// Base provider configuration
export interface BaseProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  isEnabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, unknown>;
  webhookUrl?: string;
  lastSyncAt?: Date;
  errorMessage?: string;
}

// Provider interface that all providers must implement
export interface IntegrationProvider<TConfig = Record<string, unknown>> {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  logo?: string;
  website?: string;

  // Configuration schema
  configSchema: z.ZodSchema<TConfig>;

  // Lifecycle methods
  initialize(config: TConfig): Promise<void>;
  validateCredentials(credentials: Record<string, string>): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<void>;
}

// ============================================
// PAYMENT PROVIDERS
// ============================================

export interface PaymentRequest {
  amount: number; // In millimes (Tunisian smallest unit)
  currency: 'TND';
  orderId: string;
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string; // For redirect-based payments
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  providerRef?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface PaymentWebhookPayload {
  transactionId: string;
  status: PaymentResponse['status'];
  amount: number;
  orderId: string;
  timestamp: Date;
  signature?: string;
  rawPayload: unknown;
}

export interface PaymentProvider extends IntegrationProvider {
  category: 'payment';

  // Payment methods
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  getPaymentStatus(transactionId: string): Promise<PaymentResponse>;
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentWebhookPayload>;

  // Supported features
  supportsRefund: boolean;
  supportsPartialRefund: boolean;
  supportsRecurring: boolean;
}

// ============================================
// SMS PROVIDERS
// ============================================

export interface SmsRequest {
  to: string | string[]; // Phone numbers in international format
  message: string;
  from?: string; // Sender ID
  scheduledAt?: Date;
  metadata?: Record<string, string>;
}

export interface SmsResponse {
  success: boolean;
  messageId: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'scheduled';
  to: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
  rawResponse?: unknown;
}

export interface SmsBulkResponse {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  messages: SmsResponse[];
}

export interface SmsProvider extends IntegrationProvider {
  category: 'sms';

  // SMS methods
  sendSms(request: SmsRequest): Promise<SmsResponse>;
  sendBulkSms(requests: SmsRequest[]): Promise<SmsBulkResponse>;
  getMessageStatus(messageId: string): Promise<SmsResponse>;
  getBalance(): Promise<{ balance: number; currency: string }>;

  // Features
  supportsBulk: boolean;
  supportsScheduling: boolean;
  maxMessageLength: number;
}

// ============================================
// SHIPPING PROVIDERS
// ============================================

export interface ShippingAddress {
  name: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  state?: string; // Gouvernorat in Tunisia
  postalCode?: string;
  country: string; // ISO 2-letter code
  phone: string;
  email?: string;
}

export interface ShippingPackage {
  weight: number; // In kg
  length?: number; // In cm
  width?: number;
  height?: number;
  description?: string;
  value?: number; // Declared value in TND
  quantity?: number;
}

export interface ShippingRequest {
  orderId: string;
  sender: ShippingAddress;
  recipient: ShippingAddress;
  packages: ShippingPackage[];
  serviceType: string; // Provider-specific service code
  cashOnDelivery?: number; // COD amount in TND
  insurance?: boolean;
  signature?: boolean;
  instructions?: string;
  metadata?: Record<string, string>;
}

export interface ShippingRate {
  serviceType: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  carrier: string;
}

export interface ShippingResponse {
  success: boolean;
  shipmentId: string;
  trackingNumber: string;
  labelUrl?: string;
  status: 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  estimatedDelivery?: Date;
  cost?: number;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
}

export interface TrackingResponse {
  success: boolean;
  trackingNumber: string;
  status: ShippingResponse['status'];
  events: TrackingEvent[];
  estimatedDelivery?: Date;
}

export interface ShippingProvider extends IntegrationProvider {
  category: 'shipping';

  // Shipping methods
  getRates(request: Omit<ShippingRequest, 'serviceType'>): Promise<ShippingRate[]>;
  createShipment(request: ShippingRequest): Promise<ShippingResponse>;
  getShipmentStatus(shipmentId: string): Promise<ShippingResponse>;
  trackShipment(trackingNumber: string): Promise<TrackingResponse>;
  cancelShipment(shipmentId: string): Promise<{ success: boolean; message: string }>;
  printLabel(shipmentId: string): Promise<{ labelUrl: string; format: string }>;

  // Features
  supportsCashOnDelivery: boolean;
  supportsInsurance: boolean;
  supportsPickup: boolean;
  availableServices: string[];
}

// ============================================
// FISCAL PROVIDERS (CNSS, DGI)
// ============================================

export interface CnssEmployee {
  cin: string; // Carte d'identité nationale
  cnssNumber: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  hireDate: Date;
  grossSalary: number;
  workDays: number;
  category: string; // Catégorie professionnelle
}

export interface CnssDeclaration {
  period: string; // Format: YYYY-MM
  employer: {
    cnssNumber: string;
    name: string;
    address: string;
  };
  employees: CnssEmployee[];
  totalGrossSalary: number;
  employerContribution: number; // 16.57%
  employeeContribution: number; // 9.18%
  totalContribution: number;
}

export interface CnssDeclarationResponse {
  success: boolean;
  declarationId: string;
  referenceNumber: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'pending_payment';
  totalAmount: number;
  dueDate: Date;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface TaxDeclaration {
  type: 'tva' | 'is' | 'irpp' | 'rs' | 'tclp'; // Types de déclarations fiscales tunisiennes
  period: string; // Format: YYYY-MM or YYYY-Q1/Q2/Q3/Q4
  data: Record<string, unknown>; // Specific fields per declaration type
}

export interface FiscalProvider extends IntegrationProvider {
  category: 'fiscal';

  // CNSS methods
  submitCnssDeclaration?(declaration: CnssDeclaration): Promise<CnssDeclarationResponse>;
  getCnssDeclarationStatus?(declarationId: string): Promise<CnssDeclarationResponse>;
  downloadCnssReceipt?(declarationId: string): Promise<{ url: string; format: string }>;

  // Tax methods (DGI)
  submitTaxDeclaration?(declaration: TaxDeclaration): Promise<{ success: boolean; referenceNumber: string }>;
  getTaxDeclarationStatus?(referenceNumber: string): Promise<{ status: string; details: unknown }>;

  // Validation
  validateCin?(cin: string): Promise<boolean>;
  validateCnssNumber?(cnssNumber: string): Promise<boolean>;
}

// ============================================
// PROVIDER REGISTRY
// ============================================

export interface ProviderInfo {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  logo?: string;
  website?: string;
  isAvailable: boolean;
  requiredCredentials: string[];
  optionalCredentials?: string[];
}

export type ProviderFactory<T extends IntegrationProvider = IntegrationProvider> =
  (config: Record<string, unknown>) => T;
