/**
 * Authentication validators (Zod schemas)
 */

import { z } from 'zod';

/**
 * Password requirements:
 * - Min 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Email schema with normalization
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Register schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50).trim(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50).trim(),
  organizationName: z.string().min(2).max(100).trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Verify email schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/**
 * Create organization schema
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).trim(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Update organization schema
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  logoUrl: z.string().url().optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Invite member schema
 */
export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be either admin or member' }),
  }),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/**
 * Update member role schema
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Create role schema
 */
export const createRoleSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/**
 * Update role schema
 */
export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).trim().optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/**
 * Request passwordless login schema
 */
export const requestPasswordlessLoginSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordlessLoginInput = z.infer<typeof requestPasswordlessLoginSchema>;

/**
 * Verify passwordless login schema
 */
export const verifyPasswordlessLoginSchema = z.object({
  token: z.string().min(1, 'Login token is required'),
});

export type VerifyPasswordlessLoginInput = z.infer<typeof verifyPasswordlessLoginSchema>;
