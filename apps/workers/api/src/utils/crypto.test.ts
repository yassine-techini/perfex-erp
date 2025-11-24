/**
 * Crypto utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateRandomToken,
} from './crypto';

describe('Crypto Utils', () => {
  const TEST_SECRET = 'test-secret-key-for-jwt';

  describe('Password hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should compare passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const valid = await comparePassword(password, hash);
      const invalid = await comparePassword('WrongPassword', hash);

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate access token', () => {
      const token = generateAccessToken('user-123', 'test@example.com', TEST_SECRET);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should generate refresh token', () => {
      const token = generateRefreshToken('user-123', 'session-123', TEST_SECRET);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify and decode access token', () => {
      const token = generateAccessToken('user-123', 'test@example.com', TEST_SECRET);
      const payload = verifyToken(token, TEST_SECRET);

      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token', TEST_SECRET);
      }).toThrow();
    });

    it('should throw error for wrong secret', () => {
      const token = generateAccessToken('user-123', 'test@example.com', TEST_SECRET);

      expect(() => {
        verifyToken(token, 'wrong-secret');
      }).toThrow('Invalid token');
    });
  });

  describe('Random token generation', () => {
    it('should generate random token', () => {
      const token = generateRandomToken(32);

      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();

      expect(token1).not.toBe(token2);
    });
  });
});
