/**
 * Input Validation Utilities
 * Safe parsing and validation for user input
 */

/**
 * Pagination defaults and limits
 */
export const PAGINATION_DEFAULTS = {
  LIMIT: 25,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  OFFSET: 0,
} as const;

/**
 * Parse and validate pagination parameters
 * Ensures limit and offset are within safe bounds
 */
export function validatePagination(
  limitStr?: string | null,
  offsetStr?: string | null,
  options?: {
    defaultLimit?: number;
    maxLimit?: number;
  }
): { limit: number; offset: number } {
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULTS.LIMIT;
  const maxLimit = options?.maxLimit ?? PAGINATION_DEFAULTS.MAX_LIMIT;

  // Parse limit with bounds checking
  let limit = defaultLimit;
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      limit = Math.min(Math.max(PAGINATION_DEFAULTS.MIN_LIMIT, parsed), maxLimit);
    }
  }

  // Parse offset with minimum of 0
  let offset = PAGINATION_DEFAULTS.OFFSET;
  if (offsetStr) {
    const parsed = parseInt(offsetStr, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      offset = Math.max(0, parsed);
    }
  }

  return { limit, offset };
}

/**
 * Parse and validate a positive integer
 * Returns defaultValue if parsing fails or value is invalid
 */
export function parsePositiveInt(
  value: string | undefined | null,
  defaultValue: number
): number {
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Parse and validate a positive float
 * Returns defaultValue if parsing fails or value is invalid
 */
export function parsePositiveFloat(
  value: string | undefined | null,
  defaultValue: number
): number {
  if (!value) return defaultValue;

  const parsed = parseFloat(value);
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Validate an enum value against allowed values
 * Returns defaultValue if the value is not in the allowed list
 */
export function validateEnum<T extends readonly string[]>(
  value: string | undefined | null,
  allowedValues: T,
  defaultValue: T[number]
): T[number] {
  if (!value) return defaultValue;
  return (allowedValues as readonly string[]).includes(value)
    ? (value as T[number])
    : defaultValue;
}

/**
 * Validate UUID format
 * Returns true if the string is a valid UUID v4
 */
export function isValidUUID(value: string | undefined | null): boolean {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate organization ID exists and matches expected format
 * Throws error if invalid
 */
export function validateOrganizationId(organizationId: string | undefined | null): string {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  // Accept both UUID format and custom IDs (org-xxx, company-xxx, etc.)
  if (!isValidUUID(organizationId) && !organizationId.match(/^[a-z]+-[a-z0-9-]+$/i)) {
    throw new Error('Invalid organization ID format');
  }
  return organizationId;
}

/**
 * Require organization ID - returns the ID or throws
 * Use this in routes to ensure organizationId is present
 */
export function requireOrganizationId(organizationId: string | undefined | null): string {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  return organizationId;
}

/**
 * Sanitize string input by removing potential XSS characters
 */
export function sanitizeString(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate date string and return Date object
 * Returns null if invalid
 */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Validate date range
 * Returns object with validated start and end dates
 */
export function validateDateRange(
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null
): { startDate: Date | null; endDate: Date | null } {
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);

  // Ensure startDate is before endDate
  if (startDate && endDate && startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }

  return { startDate, endDate };
}

/**
 * Parse months parameter for reporting (1-36 months)
 */
export function parseMonths(value: string | undefined | null, defaultMonths = 12): number {
  const parsed = parsePositiveInt(value, defaultMonths);
  return Math.min(Math.max(1, parsed), 36); // 1-36 months range
}
