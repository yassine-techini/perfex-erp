/**
 * CRM types
 */

export type CompanyType = 'customer' | 'prospect' | 'partner' | 'vendor';
export type CompanySize = 'small' | 'medium' | 'large' | 'enterprise';
export type ContactStatus = 'active' | 'inactive';
export type OpportunityStatus = 'open' | 'won' | 'lost';
export type ActivityType = 'task' | 'call' | 'meeting' | 'email' | 'note';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high';
export type RelatedToType = 'company' | 'contact' | 'opportunity';

/**
 * Company
 */
export interface Company {
  id: string;
  organizationId: string;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  industry: string | null;
  size: CompanySize | null;
  type: CompanyType;
  status: string;
  assignedTo: string | null;
  tags: string | null; // JSON array
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact
 */
export interface Contact {
  id: string;
  organizationId: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  position: string | null;
  department: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: ContactStatus;
  isPrimary: boolean;
  assignedTo: string | null;
  tags: string | null; // JSON array
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact with Company
 */
export interface ContactWithCompany extends Contact {
  company: Company | null;
}

/**
 * Pipeline Stage
 */
export interface PipelineStage {
  id: string;
  organizationId: string;
  name: string;
  order: number;
  probability: number;
  color: string | null;
  active: boolean;
  createdAt: Date;
}

/**
 * Opportunity
 */
export interface Opportunity {
  id: string;
  organizationId: string;
  companyId: string;
  contactId: string | null;
  name: string;
  description: string | null;
  value: number;
  currency: string;
  stageId: string;
  probability: number;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  status: OpportunityStatus;
  lostReason: string | null;
  assignedTo: string | null;
  tags: string | null; // JSON array
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Opportunity with relationships
 */
export interface OpportunityWithDetails extends Opportunity {
  company: Company;
  contact: Contact | null;
  stage: PipelineStage;
}

/**
 * Activity
 */
export interface Activity {
  id: string;
  organizationId: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  duration: number | null;
  location: string | null;
  relatedToType: RelatedToType | null;
  relatedToId: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product
 */
export interface Product {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  currency: string;
  unit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Opportunity Product
 */
export interface OpportunityProduct {
  id: string;
  opportunityId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  createdAt: Date;
}

/**
 * Opportunity Product with Product details
 */
export interface OpportunityProductWithDetails extends OpportunityProduct {
  product: Product;
}
