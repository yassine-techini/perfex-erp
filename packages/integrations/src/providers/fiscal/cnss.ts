/**
 * CNSS Tunisia Provider
 * Caisse Nationale de Sécurité Sociale
 * Social security declarations for Tunisia
 * https://www.cnss.tn
 */

import { z } from 'zod';
import type {
  FiscalProvider,
  CnssDeclaration,
  CnssDeclarationResponse,
  CnssEmployee,
} from '../../types';

// CNSS Configuration Schema
export const CnssConfigSchema = z.object({
  employerNumber: z.string().regex(/^\d{7}$/, 'Le numéro employeur CNSS doit contenir 7 chiffres'),
  accessCode: z.string().min(1, 'Code d\'accès requis'),
  password: z.string().min(1, 'Mot de passe requis'),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export type CnssConfig = z.infer<typeof CnssConfigSchema>;

// CNSS Contribution rates (2024)
export const CNSS_RATES = {
  // Employeur
  employerTotal: 16.57, // Total part patronale
  employerRetirement: 7.76, // Retraite
  employerFamily: 2.86, // Allocations familiales
  employerSocialProtection: 5.95, // Protection sociale

  // Salarié
  employeeTotal: 9.18, // Total part salariale
  employeeRetirement: 4.74, // Retraite
  employeeSocialProtection: 4.44, // Protection sociale

  // Plafond mensuel (en millimes)
  monthlyCeiling: 6000000, // 6000 TND
};

// Employee categories
export const EMPLOYEE_CATEGORIES = {
  '1': 'Cadre supérieur',
  '2': 'Cadre',
  '3': 'Agent de maîtrise',
  '4': 'Employé qualifié',
  '5': 'Employé',
  '6': 'Ouvrier qualifié',
  '7': 'Ouvrier',
  '8': 'Manoeuvre',
  '9': 'Apprenti',
};

const API_URLS = {
  sandbox: 'https://test.cnss.tn/api/v1',
  production: 'https://employeur.cnss.tn/api/v1',
};

export class CnssProvider implements FiscalProvider {
  readonly id = 'cnss';
  readonly name = 'CNSS';
  readonly category = 'fiscal' as const;
  readonly description = 'Caisse Nationale de Sécurité Sociale - Déclarations sociales';
  readonly logo = '/integrations/cnss.png';
  readonly website = 'https://www.cnss.tn';
  readonly configSchema = CnssConfigSchema;

  private config: CnssConfig | null = null;
  private baseUrl: string = API_URLS.production;
  private sessionToken: string | null = null;

  async initialize(config: CnssConfig): Promise<void> {
    const validated = CnssConfigSchema.parse(config);
    this.config = validated;
    this.baseUrl = API_URLS[validated.environment];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const config = CnssConfigSchema.parse(credentials);
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
      // Attempt to authenticate
      const authResponse = await this.authenticate();
      if (authResponse) {
        return { success: true, message: 'Connexion CNSS réussie' };
      }
      return { success: false, message: 'Authentification CNSS échouée' };
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` };
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.sessionToken = null;
  }

  /**
   * Submit CNSS monthly declaration
   */
  async submitCnssDeclaration(declaration: CnssDeclaration): Promise<CnssDeclarationResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      await this.ensureAuthenticated();

      // Validate declaration
      this.validateDeclaration(declaration);

      // Calculate contributions
      const calculatedDeclaration = this.calculateContributions(declaration);

      const payload = this.formatDeclarationPayload(calculatedDeclaration);

      const response = await fetch(`${this.baseUrl}/declarations/monthly`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          declarationId: '',
          referenceNumber: '',
          status: 'rejected',
          totalAmount: calculatedDeclaration.totalContribution,
          dueDate: this.getDueDate(declaration.period),
          errorCode: data.code,
          errorMessage: data.message || 'Échec de la déclaration',
          rawResponse: data,
        };
      }

      return {
        success: true,
        declarationId: data.declarationId,
        referenceNumber: data.referenceNumber,
        status: data.status || 'submitted',
        totalAmount: calculatedDeclaration.totalContribution,
        dueDate: this.getDueDate(declaration.period),
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        declarationId: '',
        referenceNumber: '',
        status: 'rejected',
        totalAmount: 0,
        dueDate: new Date(),
        errorMessage: `Erreur CNSS: ${error}`,
      };
    }
  }

  /**
   * Get declaration status
   */
  async getCnssDeclarationStatus(declarationId: string): Promise<CnssDeclarationResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    try {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.baseUrl}/declarations/${declarationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get declaration status');
      }

      return {
        success: data.status === 'accepted',
        declarationId: data.declarationId,
        referenceNumber: data.referenceNumber,
        status: this.mapStatus(data.status),
        totalAmount: data.totalAmount,
        dueDate: new Date(data.dueDate),
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        declarationId,
        referenceNumber: '',
        status: 'pending_payment',
        totalAmount: 0,
        dueDate: new Date(),
        errorMessage: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Download declaration receipt (bordereaux)
   */
  async downloadCnssReceipt(declarationId: string): Promise<{ url: string; format: string }> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/declarations/${declarationId}/receipt`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }

    const data = await response.json();
    return {
      url: data.downloadUrl,
      format: 'PDF',
    };
  }

  /**
   * Validate CIN (Carte d'Identité Nationale)
   */
  async validateCin(cin: string): Promise<boolean> {
    // Tunisian CIN format: 8 digits
    const cinRegex = /^\d{8}$/;
    return cinRegex.test(cin);
  }

  /**
   * Validate CNSS number
   */
  async validateCnssNumber(cnssNumber: string): Promise<boolean> {
    // CNSS number format: 10 digits
    const cnssRegex = /^\d{10}$/;
    return cnssRegex.test(cnssNumber);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async authenticate(): Promise<string | null> {
    if (!this.config) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employerNumber: this.config.employerNumber,
          accessCode: this.config.accessCode,
          password: this.config.password,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.sessionToken = data.token;
      return data.token;
    } catch {
      return null;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionToken) {
      const token = await this.authenticate();
      if (!token) {
        throw new Error('Authentication failed');
      }
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.sessionToken}`,
    };
  }

  private validateDeclaration(declaration: CnssDeclaration): void {
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(declaration.period)) {
      throw new Error('Format de période invalide. Utilisez YYYY-MM');
    }

    // Validate employees
    for (const employee of declaration.employees) {
      if (!this.validateCin(employee.cin)) {
        throw new Error(`CIN invalide pour ${employee.firstName} ${employee.lastName}`);
      }
    }
  }

  private calculateContributions(declaration: CnssDeclaration): CnssDeclaration {
    let totalGross = 0;
    let totalEmployerContrib = 0;
    let totalEmployeeContrib = 0;

    for (const employee of declaration.employees) {
      // Apply ceiling
      const cappedSalary = Math.min(employee.grossSalary, CNSS_RATES.monthlyCeiling);

      totalGross += cappedSalary;
      totalEmployerContrib += cappedSalary * (CNSS_RATES.employerTotal / 100);
      totalEmployeeContrib += cappedSalary * (CNSS_RATES.employeeTotal / 100);
    }

    return {
      ...declaration,
      totalGrossSalary: Math.round(totalGross),
      employerContribution: Math.round(totalEmployerContrib),
      employeeContribution: Math.round(totalEmployeeContrib),
      totalContribution: Math.round(totalEmployerContrib + totalEmployeeContrib),
    };
  }

  private formatDeclarationPayload(declaration: CnssDeclaration): Record<string, unknown> {
    return {
      period: declaration.period,
      employer: {
        cnss_number: declaration.employer.cnssNumber,
        name: declaration.employer.name,
        address: declaration.employer.address,
      },
      employees: declaration.employees.map((emp: CnssEmployee) => ({
        cin: emp.cin,
        cnss_number: emp.cnssNumber,
        first_name: emp.firstName,
        last_name: emp.lastName,
        birth_date: emp.birthDate.toISOString().split('T')[0],
        hire_date: emp.hireDate.toISOString().split('T')[0],
        gross_salary: emp.grossSalary,
        work_days: emp.workDays,
        category: emp.category,
      })),
      totals: {
        gross_salary: declaration.totalGrossSalary,
        employer_contribution: declaration.employerContribution,
        employee_contribution: declaration.employeeContribution,
        total_contribution: declaration.totalContribution,
      },
    };
  }

  private getDueDate(period: string): Date {
    // CNSS declarations are due by the 28th of the following month
    const [year, month] = period.split('-').map(Number);
    const dueDate = new Date(year, month, 28); // month is 0-indexed, so this gives next month
    return dueDate;
  }

  private mapStatus(status: string): CnssDeclarationResponse['status'] {
    const statusMap: Record<string, CnssDeclarationResponse['status']> = {
      submitted: 'submitted',
      accepted: 'accepted',
      rejected: 'rejected',
      pending: 'pending_payment',
      paid: 'accepted',
    };
    return statusMap[status?.toLowerCase()] || 'pending_payment';
  }
}

export const createCnssProvider = () => new CnssProvider();

// Export helper for generating declaration from payroll data
export function generateCnssDeclaration(
  period: string,
  employer: CnssDeclaration['employer'],
  employees: CnssEmployee[]
): CnssDeclaration {
  return {
    period,
    employer,
    employees,
    totalGrossSalary: 0,
    employerContribution: 0,
    employeeContribution: 0,
    totalContribution: 0,
  };
}
