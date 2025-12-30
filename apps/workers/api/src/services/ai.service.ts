/**
 * AI Service
 * Handles all AI operations: chat, search, extraction, insights
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
import {
  aiConversations,
  aiEmbeddings,
  aiInsights,
  aiUsage,
  invoices,
  companies,
  contacts,
} from '@perfex/database';
import {
  AIClient,
  type ChatMessage,
  type ChatOptions,
  SYSTEM_PROMPTS,
  PROMPT_TEMPLATES,
} from '@perfex/ai-core';

/**
 * AI Service Types
 */
export interface ChatRequest {
  conversationId?: string;
  message: string;
  systemRole?: keyof typeof SYSTEM_PROMPTS;
  context?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface SearchRequest {
  query: string;
  entityType?: string;
  limit?: number;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface InvoiceExtractionResult {
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  customerName?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  raw?: string;
}

export interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

export class AIService {
  private aiClient: AIClient;

  constructor(
    private db: D1Database,
    private ai: Ai,
    private cache: KVNamespace
  ) {
    this.aiClient = new AIClient(ai);
  }

  /**
   * Chat with AI assistant
   * AI-001
   */
  async chat(
    userId: string,
    organizationId: string,
    request: ChatRequest
  ): Promise<ChatResponse> {
    const drizzleDb = drizzle(this.db);
    const now = new Date();

    // Get or create conversation
    let conversationId = request.conversationId;
    let messages: ChatMessage[] = [];

    if (conversationId) {
      // Load existing conversation
      const conversation = await drizzleDb
        .select()
        .from(aiConversations)
        .where(
          and(
            eq(aiConversations.id, conversationId),
            eq(aiConversations.userId, userId)
          )
        )
        .get() as any;

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      messages = conversation.messages as ChatMessage[];
    } else {
      // Create new conversation
      conversationId = crypto.randomUUID();

      // Add system message
      const systemRole = request.systemRole || 'assistant';
      messages.push({
        role: 'system',
        content: SYSTEM_PROMPTS[systemRole],
      });

      // Add context if provided
      if (request.context) {
        messages.push({
          role: 'system',
          content: `Context: ${request.context}`,
        });
      }
    }

    // Add user message
    messages.push({
      role: 'user',
      content: request.message,
    });

    // Call AI
    const startTime = Date.now();
    const response = await this.aiClient.chat(messages, {
      temperature: 0.7,
      max_tokens: 1024,
    });
    const duration = Date.now() - startTime;

    // Add assistant response
    messages.push({
      role: 'assistant',
      content: response.response,
    });

    // Generate title for new conversations
    let title: string | undefined;
    if (!request.conversationId) {
      title = request.message.substring(0, 100);
    }

    // Save conversation
    if (request.conversationId) {
      await drizzleDb
        .update(aiConversations)
        .set({
          messages: messages as any,
          updatedAt: now,
        })
        .where(eq(aiConversations.id, conversationId));
    } else {
      await drizzleDb.insert(aiConversations).values({
        id: conversationId,
        userId,
        title,
        messages: messages as any,
        organizationId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Track usage
    await this.trackUsage(userId, organizationId, 'chat', {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
    });

    return {
      conversationId,
      message: response.response,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens || 0,
            completionTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined,
    };
  }

  /**
   * Get conversation history
   * AI-002
   */
  async getConversations(
    userId: string,
    organizationId: string,
    limit = 20
  ): Promise<any[]> {
    const drizzleDb = drizzle(this.db);

    const conversations = await drizzleDb
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.userId, userId),
          eq(aiConversations.organizationId, organizationId)
        )
      )
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit)
      .all() as any[];

    return conversations;
  }

  /**
   * Get single conversation
   * AI-003
   */
  async getConversation(userId: string, conversationId: string): Promise<any> {
    const drizzleDb = drizzle(this.db);

    const conversation = await drizzleDb
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        )
      )
      .get() as any;

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return conversation;
  }

  /**
   * Delete conversation
   * AI-004
   */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    await drizzleDb
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        )
      );
  }

  /**
   * Smart search with embeddings
   * AI-005
   */
  async search(
    organizationId: string,
    request: SearchRequest
  ): Promise<SearchResult[]> {
    const drizzleDb = drizzle(this.db);

    // Generate embedding for query
    const queryEmbedding = await this.aiClient.embed(request.query);

    // Get cached results if available
    const cacheKey = `search:${organizationId}:${request.query}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Search embeddings
    // Note: For now, we do simple text search
    // In production, use vector similarity search
    const results: SearchResult[] = [];

    // Search invoices
    if (!request.entityType || request.entityType === 'invoice') {
      const invoiceResults = await drizzleDb
        .select()
        .from(invoices)
        .where(eq(invoices.organizationId, organizationId))
        .limit(request.limit || 10)
        .all() as any[];

      for (const invoice of invoiceResults) {
        results.push({
          entityType: 'invoice',
          entityId: invoice.id,
          content: `Invoice ${invoice.invoiceNumber} - ${invoice.customerName} - $${invoice.total}`,
          score: 0.8,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            total: invoice.total,
          },
        });
      }
    }

    // Cache results for 5 minutes
    await this.cache.put(cacheKey, JSON.stringify(results), {
      expirationTtl: 300,
    });

    return results;
  }

  /**
   * Extract data from invoice document/text
   * AI-006
   */
  async extractInvoiceData(
    organizationId: string,
    userId: string,
    text: string
  ): Promise<InvoiceExtractionResult> {
    // Define extraction schema
    const schema = JSON.stringify({
      invoiceNumber: 'string',
      date: 'string (YYYY-MM-DD)',
      dueDate: 'string (YYYY-MM-DD)',
      customerName: 'string',
      lineItems: [
        {
          description: 'string',
          quantity: 'number',
          unitPrice: 'number',
          amount: 'number',
        },
      ],
      subtotal: 'number',
      tax: 'number',
      total: 'number',
    });

    // Extract data using AI
    const result = await this.aiClient.extractData<InvoiceExtractionResult>(
      text,
      schema
    );

    // Track usage
    await this.trackUsage(userId, organizationId, 'extract', {});

    return {
      ...result,
      raw: text,
    };
  }

  /**
   * Generate insights for an entity
   * AI-007
   */
  async generateInsights(
    organizationId: string,
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<Insight[]> {
    const drizzleDb = drizzle(this.db);
    const insights: Insight[] = [];

    // Get entity data based on type
    let entityData: any;
    let prompt: string;

    switch (entityType) {
      case 'invoice':
        const invoice = await drizzleDb
          .select()
          .from(invoices)
          .where(eq(invoices.id, entityId))
          .get() as any;

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        entityData = invoice;
        prompt = PROMPT_TEMPLATES.analyzeInvoice(invoice);
        break;

      case 'customer':
        // TODO: Implement customer insights
        throw new Error('Customer insights not yet implemented');

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Generate insights using AI
    const response = await this.aiClient.generate(prompt, SYSTEM_PROMPTS.dataAnalyst);

    // Parse and store insight
    const insightId = crypto.randomUUID();
    const now = new Date();

    await drizzleDb.insert(aiInsights).values({
      id: insightId,
      type: 'analysis',
      entityType,
      entityId,
      title: `Analysis for ${entityType} ${entityId}`,
      description: response,
      confidence: 80,
      actionable: true,
      organizationId,
      createdAt: now,
    });

    insights.push({
      id: insightId,
      type: 'analysis',
      title: `Analysis for ${entityType} ${entityId}`,
      description: response,
      confidence: 80,
      actionable: true,
      createdAt: now,
    });

    // Track usage
    await this.trackUsage(userId, organizationId, 'insights', {});

    return insights;
  }

  /**
   * Get insights for organization
   * AI-008
   */
  async getInsights(
    organizationId: string,
    filters?: {
      type?: string;
      entityType?: string;
      dismissed?: boolean;
    }
  ): Promise<Insight[]> {
    const drizzleDb = drizzle(this.db);

    let query = drizzleDb
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.organizationId, organizationId))
      .$dynamic();

    if (filters?.type) {
      query = query.where(eq(aiInsights.type, filters.type));
    }

    if (filters?.entityType) {
      query = query.where(eq(aiInsights.entityType, filters.entityType));
    }

    if (filters?.dismissed !== undefined) {
      query = query.where(eq(aiInsights.dismissed, filters.dismissed ? 1 : 0));
    }

    const results = await query.orderBy(desc(aiInsights.createdAt)).limit(50).all() as any[];

    return results.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      confidence: r.confidence || 0,
      actionable: !!r.actionable,
      data: r.data as Record<string, any>,
      createdAt: new Date(r.createdAt),
    }));
  }

  /**
   * Dismiss an insight
   * AI-009
   */
  async dismissInsight(insightId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    await drizzleDb
      .update(aiInsights)
      .set({ dismissed: 1 })
      .where(
        and(
          eq(aiInsights.id, insightId),
          eq(aiInsights.organizationId, organizationId)
        )
      );
  }

  /**
   * Get AI usage statistics
   * AI-010
   */
  async getUsageStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const drizzleDb = drizzle(this.db);

    let query = drizzleDb
      .select()
      .from(aiUsage)
      .where(eq(aiUsage.organizationId, organizationId))
      .$dynamic();

    const results = await query.orderBy(desc(aiUsage.createdAt)).limit(1000).all() as any[];

    // Aggregate stats
    const stats = {
      totalRequests: results.length,
      totalTokens: results.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
      totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0),
      byFeature: {} as Record<string, any>,
    };

    for (const usage of results) {
      if (!stats.byFeature[usage.feature]) {
        stats.byFeature[usage.feature] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }

      stats.byFeature[usage.feature].requests += 1;
      stats.byFeature[usage.feature].tokens += usage.totalTokens || 0;
      stats.byFeature[usage.feature].cost += usage.cost || 0;
    }

    return stats;
  }

  /**
   * Track AI usage
   * Private helper method
   */
  private async trackUsage(
    userId: string,
    organizationId: string,
    feature: string,
    usage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    }
  ): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Calculate cost (example: $0.0001 per 1K tokens)
    const cost = usage.totalTokens
      ? Math.ceil((usage.totalTokens / 1000) * 0.01 * 100) // in cents
      : 0;

    await drizzleDb.insert(aiUsage).values({
      id: crypto.randomUUID(),
      userId,
      feature,
      model: '@cf/meta/llama-3.1-8b-instruct',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost,
      organizationId,
      createdAt: new Date(),
    });
  }
}
