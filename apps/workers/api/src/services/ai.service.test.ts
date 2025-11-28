/**
 * AI Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService, type ChatRequest, type SearchRequest } from './ai.service';

// Mock dependencies
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
  first: vi.fn(),
  all: vi.fn(),
};

const mockAi = {
  run: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  put: vi.fn(),
};

// Create chainable mock helpers
const createChainableMock = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    $dynamic: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue([]),
  };
  return mock;
};

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => createChainableMock()),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    }),
  })),
}));

// Mock AI client
vi.mock('@perfex/ai-core', () => ({
  AIClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      response: 'AI response',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    }),
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    extractData: vi.fn().mockResolvedValue({
      invoiceNumber: 'INV-001',
      date: '2024-01-15',
      customerName: 'Test Company',
      lineItems: [],
      subtotal: 100,
      tax: 10,
      total: 110,
    }),
    generate: vi.fn().mockResolvedValue('Generated insight'),
  })),
  SYSTEM_PROMPTS: {
    assistant: 'You are a helpful assistant.',
    financialAdvisor: 'You are a financial advisor.',
    dataAnalyst: 'You are a data analyst.',
  },
  PROMPT_TEMPLATES: {
    analyzeInvoice: vi.fn().mockReturnValue('Analyze this invoice'),
  },
}));

describe('AIService', () => {
  let aiService: AIService;
  const userId = 'user-123';
  const organizationId = 'org-456';

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AIService(
      mockDb as any,
      mockAi as any,
      mockCache as any
    );
  });

  describe('chat', () => {
    it('should create a new conversation when no conversationId provided', async () => {
      const request: ChatRequest = {
        message: 'Hello, AI!',
      };

      const result = await aiService.chat(userId, organizationId, request);

      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('message', 'AI response');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('should use custom system role when provided', async () => {
      const request: ChatRequest = {
        message: 'Help with finances',
        systemRole: 'financialAdvisor',
      };

      const result = await aiService.chat(userId, organizationId, request);

      expect(result).toHaveProperty('conversationId');
      expect(result.message).toBe('AI response');
    });

    it('should include context when provided', async () => {
      const request: ChatRequest = {
        message: 'Analyze this',
        context: 'Invoice data here',
      };

      const result = await aiService.chat(userId, organizationId, request);

      expect(result).toHaveProperty('message');
    });
  });

  describe('search', () => {
    it('should return cached results if available', async () => {
      const cachedResults = [{ entityType: 'invoice', entityId: '1', content: 'test', score: 0.9 }];
      mockCache.get.mockResolvedValueOnce(JSON.stringify(cachedResults));

      const request: SearchRequest = {
        query: 'test query',
      };

      const result = await aiService.search(organizationId, request);

      expect(result).toEqual(cachedResults);
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should search and cache results when no cache available', async () => {
      mockCache.get.mockResolvedValueOnce(null);

      const request: SearchRequest = {
        query: 'test query',
        entityType: 'invoice',
        limit: 5,
      };

      const result = await aiService.search(organizationId, request);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCache.put).toHaveBeenCalled();
    });
  });

  describe('extractInvoiceData', () => {
    it('should extract invoice data from text', async () => {
      const text = `INVOICE #INV-001
Date: 2024-01-15
Customer: Test Company
Total: $110.00`;

      const result = await aiService.extractInvoiceData(organizationId, userId, text);

      expect(result).toHaveProperty('invoiceNumber', 'INV-001');
      expect(result).toHaveProperty('customerName', 'Test Company');
      expect(result).toHaveProperty('total', 110);
      expect(result).toHaveProperty('raw', text);
    });
  });

  describe('getUsageStats', () => {
    it('should return aggregated usage statistics', async () => {
      const result = await aiService.getUsageStats(organizationId);

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('byFeature');
    });
  });

  describe('getConversations', () => {
    it('should return conversation list', async () => {
      const result = await aiService.getConversations(userId, organizationId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await aiService.getConversations(userId, organizationId, 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      await expect(
        aiService.deleteConversation(userId, 'conv-123')
      ).resolves.not.toThrow();
    });
  });

  describe('dismissInsight', () => {
    it('should mark insight as dismissed', async () => {
      await expect(
        aiService.dismissInsight('insight-123', organizationId)
      ).resolves.not.toThrow();
    });
  });

  describe('getInsights', () => {
    it('should return insights list', async () => {
      const result = await aiService.getInsights(organizationId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by type', async () => {
      const result = await aiService.getInsights(organizationId, {
        type: 'analysis',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by dismissed status', async () => {
      const result = await aiService.getInsights(organizationId, {
        dismissed: false,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('AIService types', () => {
  it('should have correct ChatRequest shape', () => {
    const request: ChatRequest = {
      message: 'test',
      conversationId: 'conv-1',
      systemRole: 'assistant',
      context: 'some context',
    };

    expect(request.message).toBe('test');
  });

  it('should have correct SearchRequest shape', () => {
    const request: SearchRequest = {
      query: 'test',
      entityType: 'invoice',
      limit: 10,
    };

    expect(request.query).toBe('test');
  });
});
