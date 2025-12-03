/**
 * Cryptographic utilities
 * Password hashing and JWT token generation/verification
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload, RefreshTokenPayload } from '@perfex/shared';

/**
 * Hash a password using bcrypt (cost 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token (24 hours expiry)
 */
export function generateAccessToken(
  userId: string,
  email: string,
  secret: string
): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    email,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  return jwt.sign(payload, secret);
}

/**
 * Generate a refresh token (7 days expiry)
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  secret: string
): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return jwt.sign(payload, secret);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken<T = AccessTokenPayload | RefreshTokenPayload>(
  token: string,
  secret: string
): T {
  try {
    return jwt.verify(token, secret) as T;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate a random token for email verification or password reset
 */
export function generateRandomToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
