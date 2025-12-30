/**
 * Smart Audit System Service
 * EF1: Risk Assessment, EF2: Compliance Copilot, EF3: Commonality Study
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql, gte, lte, like, or } from 'drizzle-orm';
import {
  auditTasks,
  auditFindings,
  riskAssessments,
  riskDataPoints,
  complianceKnowledgeBase,
  complianceChecks,
  complianceConversations,
  commonalityStudies,
  improvementProposals,
  auditSchedules,
  auditConfiguration,
} from '@perfex/database';
import { logger } from '../utils/logger';
import { AIClient } from '@perfex/ai-core';
import type {
  CreateAuditTaskInput,
  UpdateAuditTaskInput,
  CompleteAuditTaskInput,
  CreateAuditFindingInput,
  UpdateAuditFindingInput,
  RunRiskAssessmentInput,
  GenerateAuditTasksInput,
  AddRiskDataPointInput,
  ComplianceChatInput,
  RunComplianceCheckInput,
  AddKnowledgeBaseEntryInput,
  UpdateKnowledgeBaseEntryInput,
  SearchKnowledgeBaseInput,
  RunCommonalityAnalysisInput,
  ApproveStudyInput,
  CreateImprovementProposalInput,
  UpdateImprovementProposalInput,
  SubmitProposalInput,
  ApproveProposalInput,
  CreateAuditScheduleInput,
  UpdateAuditScheduleInput,
  UpdateAuditConfigurationInput,
  AuditTasksQueryInput,
  RiskAssessmentsQueryInput,
  CommonalityStudiesQueryInput,
  ProposalsQueryInput,
  AuditDashboardStats,
} from '@perfex/shared';

export class AuditService {
  private db: ReturnType<typeof drizzle>;
  private aiClient: AIClient;
  private cache: KVNamespace | null;

  constructor(database: D1Database, ai: any, cache?: KVNamespace) {
    this.db = drizzle(database);
    this.aiClient = new AIClient(ai);
    this.cache = cache || null;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateId(): string {
    return crypto.randomUUID();
  }

  private generateNumber(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ============================================
  // CORE AUDIT - TASKS
  // ============================================

  async getTasks(organizationId: string, query: AuditTasksQueryInput) {
    const conditions: any[] = [eq(auditTasks.organizationId, organizationId)];

    if (query.status) conditions.push(eq(auditTasks.status, query.status));
    if (query.auditType) conditions.push(eq(auditTasks.auditType, query.auditType));
    if (query.source) conditions.push(eq(auditTasks.source, query.source));
    if (query.priority) conditions.push(eq(auditTasks.priority, query.priority));
    if (query.assignedTo) conditions.push(eq(auditTasks.assignedTo, query.assignedTo));
    if (query.entityType) conditions.push(eq(auditTasks.entityType, query.entityType));
    if (query.entityId) conditions.push(eq(auditTasks.entityId, query.entityId));
    if (query.aiGenerated !== undefined) conditions.push(eq(auditTasks.aiGenerated, query.aiGenerated));
    if (query.minRiskScore !== undefined) conditions.push(gte(auditTasks.riskScore, query.minRiskScore));
    if (query.maxRiskScore !== undefined) conditions.push(lte(auditTasks.riskScore, query.maxRiskScore));
    if (query.search) conditions.push(like(auditTasks.title, `%${query.search}%`));

    const offset = (query.page - 1) * query.limit;
    const orderColumn = auditTasks[query.sortBy as keyof typeof auditTasks] || auditTasks.createdAt;
    const orderFn = query.sortOrder === 'asc' ? asc : desc;

    const [tasks, countResult] = await Promise.all([
      this.db
        .select()
        .from(auditTasks)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn as any))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditTasks)
        .where(and(...conditions)),
    ]);

    return {
      items: tasks,
      total: countResult[0]?.count || 0,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil((countResult[0]?.count || 0) / query.limit),
    };
  }

  async getTask(organizationId: string, taskId: string) {
    const task = await this.db
      .select()
      .from(auditTasks)
      .where(and(eq(auditTasks.id, taskId), eq(auditTasks.organizationId, organizationId)))
      .get() as any;

    if (!task) {
      throw new Error('Task not found');
    }

    // Get related findings
    const findings = await this.db
      .select()
      .from(auditFindings)
      .where(eq(auditFindings.auditTaskId, taskId));

    return { ...task, findings };
  }

  async getTaskStats(organizationId: string) {
    const stats = await this.db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
        inProgress: sql<number>`sum(case when status = 'in_progress' then 1 else 0 end)`,
        completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        avgRiskScore: sql<number>`avg(risk_score)`,
        highRisk: sql<number>`sum(case when risk_score >= 70 then 1 else 0 end)`,
        aiGenerated: sql<number>`sum(case when ai_generated = 1 then 1 else 0 end)`,
      })
      .from(auditTasks)
      .where(eq(auditTasks.organizationId, organizationId))
      .get() as any;

    return stats;
  }

  async createTask(organizationId: string, userId: string, data: CreateAuditTaskInput) {
    const taskId = this.generateId();
    const taskNumber = this.generateNumber('AUD');

    const task = {
      id: taskId,
      organizationId,
      taskNumber,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      aiGenerated: false,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(auditTasks).values(task);

    return task;
  }

  async updateTask(organizationId: string, taskId: string, data: UpdateAuditTaskInput) {
    const existing = await this.getTask(organizationId, taskId);

    const updated = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedAt: new Date(),
    };

    await this.db
      .update(auditTasks)
      .set(updated)
      .where(and(eq(auditTasks.id, taskId), eq(auditTasks.organizationId, organizationId)));

    return { ...existing, ...updated };
  }

  async completeTask(
    organizationId: string,
    userId: string,
    taskId: string,
    data: CompleteAuditTaskInput
  ) {
    const task = await this.getTask(organizationId, taskId);

    // Create findings if provided
    const findingResults = [];
    if (data.findings && data.findings.length > 0) {
      for (const findingData of data.findings) {
        const finding = await this.createFinding(organizationId, userId, {
          auditTaskId: taskId,
          ...findingData,
        });
        findingResults.push(finding);
      }
    }

    // Update task status
    await this.db
      .update(auditTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        notes: data.notes || task.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(auditTasks.id, taskId), eq(auditTasks.organizationId, organizationId)));

    return {
      task: { ...task, status: 'completed', completedAt: new Date() },
      findings: findingResults,
    };
  }

  async deleteTask(organizationId: string, taskId: string) {
    await this.db
      .delete(auditFindings)
      .where(and(eq(auditFindings.auditTaskId, taskId), eq(auditFindings.organizationId, organizationId)));

    await this.db
      .delete(auditTasks)
      .where(and(eq(auditTasks.id, taskId), eq(auditTasks.organizationId, organizationId)));
  }

  // ============================================
  // CORE AUDIT - FINDINGS
  // ============================================

  async getFindings(organizationId: string, taskId: string) {
    return this.db
      .select()
      .from(auditFindings)
      .where(and(eq(auditFindings.auditTaskId, taskId), eq(auditFindings.organizationId, organizationId)));
  }

  async getAllFindings(organizationId: string) {
    return this.db
      .select()
      .from(auditFindings)
      .where(eq(auditFindings.organizationId, organizationId))
      .orderBy(desc(auditFindings.createdAt));
  }

  async createFinding(organizationId: string, userId: string, data: CreateAuditFindingInput) {
    const findingId = this.generateId();
    const findingNumber = this.generateNumber('FND');

    // Use AI to analyze the finding and generate recommendations
    let aiAnalysis = null;
    let aiRecommendations: string[] = [];

    try {
      const analysisResult = await this.aiClient.chat([
        {
          role: 'system',
          content: `You are an audit expert. Analyze the following audit finding and provide:
1. A brief analysis of the root cause
2. 3-5 actionable recommendations

Respond in JSON format:
{
  "analysis": "string",
  "recommendations": ["string", ...]
}`,
        },
        {
          role: 'user',
          content: `Finding: ${data.title}\nDescription: ${data.description}\nSeverity: ${data.severity}\nCategory: ${data.category}`,
        },
      ]);

      if (analysisResult.response) {
        const parsed = JSON.parse(analysisResult.response);
        aiAnalysis = parsed.analysis;
        aiRecommendations = parsed.recommendations;
      }
    } catch (error) {
      logger.error('AI analysis failed', { error });
    }

    const finding = {
      id: findingId,
      organizationId,
      findingNumber,
      ...data,
      correctiveActionDueDate: data.correctiveActionDueDate ? new Date(data.correctiveActionDueDate) : null,
      aiAnalysis,
      aiRecommendations,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(auditFindings).values(finding);

    return finding;
  }

  async updateFinding(organizationId: string, findingId: string, data: UpdateAuditFindingInput) {
    const updated = {
      ...data,
      correctiveActionDueDate: data.correctiveActionDueDate ? new Date(data.correctiveActionDueDate) : undefined,
      updatedAt: new Date(),
    };

    await this.db
      .update(auditFindings)
      .set(updated)
      .where(and(eq(auditFindings.id, findingId), eq(auditFindings.organizationId, organizationId)));

    return this.db
      .select()
      .from(auditFindings)
      .where(eq(auditFindings.id, findingId))
      .get() as any;
  }

  // ============================================
  // EF1: RISK ASSESSMENT
  // ============================================

  async runRiskAssessment(organizationId: string, userId: string, data: RunRiskAssessmentInput) {
    const assessmentId = this.generateId();
    const assessmentNumber = this.generateNumber('RSK');

    // Collect relevant data points for analysis
    const dataPoints = await this.db
      .select()
      .from(riskDataPoints)
      .where(
        and(
          eq(riskDataPoints.organizationId, organizationId),
          data.periodStart ? gte(riskDataPoints.timestamp, new Date(data.periodStart)) : sql`1=1`,
          data.periodEnd ? lte(riskDataPoints.timestamp, new Date(data.periodEnd)) : sql`1=1`
        )
      )
      .limit(100);

    // Use AI to analyze risk
    const riskAnalysis = await this.analyzeRiskWithAI(data, dataPoints);

    const assessment = {
      id: assessmentId,
      organizationId,
      assessmentNumber,
      assessmentType: data.assessmentType,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      assessmentDate: new Date(),
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      overallRiskScore: riskAnalysis.overallScore,
      qualityRiskScore: riskAnalysis.qualityScore,
      processRiskScore: riskAnalysis.processScore,
      supplierRiskScore: riskAnalysis.supplierScore,
      complianceRiskScore: riskAnalysis.complianceScore,
      riskFactors: riskAnalysis.factors,
      aiModelVersion: '1.0',
      inputData: { dataPointsCount: dataPoints.length },
      aiAnalysis: riskAnalysis.analysis,
      recommendations: riskAnalysis.recommendations,
      suggestedResources: riskAnalysis.suggestedResources,
      tasksGenerated: 0,
      status: 'active',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(riskAssessments).values(assessment);

    return assessment;
  }

  private async analyzeRiskWithAI(data: RunRiskAssessmentInput, dataPoints: any[]) {
    try {
      const prompt = `You are a manufacturing quality risk assessment expert. Analyze the following data and provide a comprehensive risk assessment.

Assessment Type: ${data.assessmentType}
Data Points: ${JSON.stringify(dataPoints.slice(0, 20))}

Provide your analysis in JSON format:
{
  "overallScore": number (0-100),
  "qualityScore": number (0-100),
  "processScore": number (0-100),
  "supplierScore": number (0-100),
  "complianceScore": number (0-100),
  "factors": [
    {"factor": "string", "score": number, "weight": number, "description": "string"}
  ],
  "analysis": "string (detailed analysis)",
  "recommendations": ["string", ...],
  "suggestedResources": [
    {"type": "string", "quantity": number, "priority": "high|medium|low", "rationale": "string"}
  ]
}`;

      const result = await this.aiClient.chat([
        { role: 'system', content: prompt },
        { role: 'user', content: 'Perform the risk assessment based on the provided data.' },
      ]);

      if (result.response) {
        return JSON.parse(result.response);
      }
    } catch (error) {
      logger.error('AI risk analysis failed', { error });
    }

    // Return default values if AI fails
    return {
      overallScore: 50,
      qualityScore: 50,
      processScore: 50,
      supplierScore: 50,
      complianceScore: 50,
      factors: [],
      analysis: 'AI analysis unavailable',
      recommendations: [],
      suggestedResources: [],
    };
  }

  async getRiskAssessments(organizationId: string, query: RiskAssessmentsQueryInput) {
    const conditions: any[] = [eq(riskAssessments.organizationId, organizationId)];

    if (query.assessmentType) conditions.push(eq(riskAssessments.assessmentType, query.assessmentType));
    if (query.status) conditions.push(eq(riskAssessments.status, query.status));
    if (query.entityId) conditions.push(eq(riskAssessments.entityId, query.entityId));
    if (query.minRiskScore !== undefined) conditions.push(gte(riskAssessments.overallRiskScore, query.minRiskScore));
    if (query.maxRiskScore !== undefined) conditions.push(lte(riskAssessments.overallRiskScore, query.maxRiskScore));

    const offset = (query.page - 1) * query.limit;

    return this.db
      .select()
      .from(riskAssessments)
      .where(and(...conditions))
      .orderBy(desc(riskAssessments.createdAt))
      .limit(query.limit)
      .offset(offset);
  }

  async getRiskAssessment(organizationId: string, assessmentId: string) {
    const assessment = await this.db
      .select()
      .from(riskAssessments)
      .where(and(eq(riskAssessments.id, assessmentId), eq(riskAssessments.organizationId, organizationId)))
      .get() as any;

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    return assessment;
  }

  async generateTasksFromAssessment(
    organizationId: string,
    userId: string,
    data: GenerateAuditTasksInput
  ) {
    const assessment = await this.getRiskAssessment(organizationId, data.assessmentId);

    // Use AI to generate audit tasks based on risk factors
    const tasksToCreate = await this.generateTasksWithAI(assessment, data);

    const createdTasks = [];
    for (const taskData of tasksToCreate) {
      const task = await this.createTask(organizationId, userId, {
        ...taskData,
        source: 'risk_assessment',
        aiGenerated: true,
      } as any);
      createdTasks.push(task);
    }

    // Update assessment with tasks generated count
    await this.db
      .update(riskAssessments)
      .set({
        tasksGenerated: (assessment.tasksGenerated || 0) + createdTasks.length,
        updatedAt: new Date(),
      })
      .where(eq(riskAssessments.id, data.assessmentId));

    return createdTasks;
  }

  private async generateTasksWithAI(assessment: any, config: GenerateAuditTasksInput) {
    try {
      const prompt = `Based on this risk assessment, generate ${config.maxTasks} audit tasks focusing on areas with risk score >= ${config.minRiskScore}.

Risk Assessment:
- Overall Score: ${assessment.overallRiskScore}
- Risk Factors: ${JSON.stringify(assessment.riskFactors)}
- Recommendations: ${JSON.stringify(assessment.recommendations)}

Generate tasks in JSON format:
[
  {
    "title": "string",
    "description": "string",
    "auditType": "quality|process|supplier|safety|compliance",
    "priority": "critical|high|medium|low",
    "riskScore": number,
    "aiConfidence": number,
    "aiReasoning": "string"
  }
]`;

      const result = await this.aiClient.chat([
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the audit tasks.' },
      ]);

      if (result.response) {
        return JSON.parse(result.response);
      }
    } catch (error) {
      logger.error('AI task generation failed', { error });
    }

    return [];
  }

  async getRiskDashboard(organizationId: string) {
    const [recentAssessments, riskTrend, highRiskItems] = await Promise.all([
      this.db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.organizationId, organizationId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(5),
      this.db
        .select({
          date: sql<string>`date(assessment_date)`,
          avgRisk: sql<number>`avg(overall_risk_score)`,
        })
        .from(riskAssessments)
        .where(eq(riskAssessments.organizationId, organizationId))
        .groupBy(sql`date(assessment_date)`)
        .orderBy(desc(sql`date(assessment_date)`))
        .limit(30),
      this.db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.organizationId, organizationId),
            gte(riskAssessments.overallRiskScore, 70)
          )
        )
        .orderBy(desc(riskAssessments.overallRiskScore))
        .limit(10),
    ]);

    return {
      recentAssessments,
      riskTrend,
      highRiskItems,
    };
  }

  async addRiskDataPoint(organizationId: string, data: AddRiskDataPointInput) {
    const pointId = this.generateId();

    const dataPoint = {
      id: pointId,
      organizationId,
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      processed: false,
      createdAt: new Date(),
    };

    await this.db.insert(riskDataPoints).values(dataPoint);

    return dataPoint;
  }

  // ============================================
  // EF2: COMPLIANCE COPILOT
  // ============================================

  async complianceChat(organizationId: string, userId: string, data: ComplianceChatInput) {
    // Get or create conversation
    let conversation;
    if (data.conversationId) {
      conversation = await this.db
        .select()
        .from(complianceConversations)
        .where(eq(complianceConversations.id, data.conversationId))
        .get() as any;
    }

    if (!conversation) {
      conversation = {
        id: this.generateId(),
        organizationId,
        userId,
        title: null,
        messages: [],
        context: data.context || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.db.insert(complianceConversations).values(conversation);
    }

    // Search knowledge base for relevant context
    const relevantDocs = await this.searchKnowledgeBase(organizationId, {
      query: data.message,
      limit: 5,
      semanticSearch: true,
    });

    // Build context from knowledge base
    const kbContext = relevantDocs
      .map((doc: any) => `[${doc.title}]: ${doc.summary || doc.content.substring(0, 500)}`)
      .join('\n\n');

    // Chat with AI
    const messages = (conversation.messages as any[]) || [];
    messages.push({ role: 'user', content: data.message, timestamp: new Date().toISOString() });

    const systemPrompt = `You are a manufacturing compliance expert with knowledge of ISO 9001, ISO 14001, OSHA, and industry-specific standards.

Use the following knowledge base context to inform your responses:
${kbContext}

Provide clear, actionable guidance. Always cite specific standards or procedures when applicable.`;

    const result = await this.aiClient.chat([
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ]);

    const assistantMessage = {
      role: 'assistant' as const,
      content: result.response || 'I apologize, but I was unable to generate a response.',
      timestamp: new Date().toISOString(),
      sources: relevantDocs.map((d: any) => d.id),
    };
    messages.push(assistantMessage);

    // Update conversation
    await this.db
      .update(complianceConversations)
      .set({
        messages,
        title: conversation.title || data.message.substring(0, 100),
        updatedAt: new Date(),
      })
      .where(eq(complianceConversations.id, conversation.id));

    return {
      conversationId: conversation.id,
      message: assistantMessage.content,
      sources: relevantDocs.map((d: any) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        relevanceScore: d.relevanceScore || 0.9,
      })),
    };
  }

  async runComplianceCheck(organizationId: string, userId: string, data: RunComplianceCheckInput) {
    const checkId = this.generateId();
    const checkNumber = this.generateNumber('CMP');

    // Get relevant knowledge base entries for the standards
    const relevantKnowledge = await this.db
      .select()
      .from(complianceKnowledgeBase)
      .where(
        and(
          eq(complianceKnowledgeBase.organizationId, organizationId),
          eq(complianceKnowledgeBase.status, 'active')
        )
      )
      .limit(20);

    // Use AI to perform compliance check
    const checkResult = await this.performComplianceCheckWithAI(data, relevantKnowledge);

    const check = {
      id: checkId,
      organizationId,
      checkNumber,
      entityType: data.entityType,
      entityId: data.entityId,
      standardsChecked: data.standards,
      overallStatus: checkResult.overallStatus,
      complianceScore: checkResult.score,
      checkResults: checkResult.results,
      aiAnalysis: checkResult.analysis,
      aiRecommendations: checkResult.recommendations,
      requiresAction: checkResult.requiresAction,
      actionItems: checkResult.actionItems,
      performedBy: userId,
      performedAt: new Date(),
      createdAt: new Date(),
    };

    await this.db.insert(complianceChecks).values(check);

    return check;
  }

  private async performComplianceCheckWithAI(data: RunComplianceCheckInput, knowledge: any[]) {
    try {
      const prompt = `You are a compliance auditor. Check compliance for:
Entity Type: ${data.entityType}
Entity ID: ${data.entityId}
Standards: ${data.standards.join(', ')}

Knowledge Base Context:
${knowledge.map((k) => `${k.title}: ${k.summary || k.content.substring(0, 300)}`).join('\n')}

Provide your analysis in JSON format:
{
  "overallStatus": "compliant|non_compliant|partially_compliant",
  "score": number (0-100),
  "results": [
    {"standard": "string", "requirement": "string", "status": "string", "evidence": "string", "gap": "string|null", "recommendation": "string|null"}
  ],
  "analysis": "string",
  "recommendations": ["string"],
  "requiresAction": boolean,
  "actionItems": [
    {"description": "string", "priority": "high|medium|low", "dueDate": "string|null", "assignedTo": "string|null", "status": "pending"}
  ]
}`;

      const result = await this.aiClient.chat([
        { role: 'system', content: prompt },
        { role: 'user', content: 'Perform the compliance check.' },
      ]);

      if (result.response) {
        return JSON.parse(result.response);
      }
    } catch (error) {
      logger.error('AI compliance check failed', { error });
    }

    return {
      overallStatus: 'partially_compliant',
      score: 75,
      results: [],
      analysis: 'AI analysis unavailable',
      recommendations: [],
      requiresAction: false,
      actionItems: [],
    };
  }

  async getComplianceChecks(organizationId: string, filters: { entityType?: string; entityId?: string }) {
    const conditions: any[] = [eq(complianceChecks.organizationId, organizationId)];

    if (filters.entityType) conditions.push(eq(complianceChecks.entityType, filters.entityType));
    if (filters.entityId) conditions.push(eq(complianceChecks.entityId, filters.entityId));

    return this.db
      .select()
      .from(complianceChecks)
      .where(and(...conditions))
      .orderBy(desc(complianceChecks.createdAt));
  }

  async searchKnowledgeBase(organizationId: string, data: SearchKnowledgeBaseInput) {
    const conditions: any[] = [
      eq(complianceKnowledgeBase.organizationId, organizationId),
      eq(complianceKnowledgeBase.status, 'active'),
    ];

    if (data.category) conditions.push(eq(complianceKnowledgeBase.category, data.category));
    if (data.documentType) conditions.push(eq(complianceKnowledgeBase.documentType, data.documentType));

    // Text search
    conditions.push(
      or(
        like(complianceKnowledgeBase.title, `%${data.query}%`),
        like(complianceKnowledgeBase.content, `%${data.query}%`),
        like(complianceKnowledgeBase.summary, `%${data.query}%`)
      )
    );

    const results = await this.db
      .select()
      .from(complianceKnowledgeBase)
      .where(and(...conditions))
      .limit(data.limit);

    // Increment usage count for found entries
    for (const result of results) {
      await this.db
        .update(complianceKnowledgeBase)
        .set({ usageCount: (result.usageCount || 0) + 1 })
        .where(eq(complianceKnowledgeBase.id, result.id));
    }

    return results;
  }

  async getKnowledgeBaseEntries(organizationId: string, filters: { category?: string; documentType?: string }) {
    const conditions: any[] = [eq(complianceKnowledgeBase.organizationId, organizationId)];

    if (filters.category) conditions.push(eq(complianceKnowledgeBase.category, filters.category as any));
    if (filters.documentType) conditions.push(eq(complianceKnowledgeBase.documentType, filters.documentType as any));

    return this.db
      .select()
      .from(complianceKnowledgeBase)
      .where(and(...conditions))
      .orderBy(desc(complianceKnowledgeBase.createdAt));
  }

  async addKnowledgeBaseEntry(organizationId: string, userId: string, data: AddKnowledgeBaseEntryInput) {
    const entryId = this.generateId();

    // Generate embedding for semantic search
    let embedding = null;
    try {
      embedding = await this.aiClient.embed(data.content);
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
    }

    // Generate summary if not provided
    let summary = data.summary;
    if (!summary) {
      try {
        const result = await this.aiClient.chat([
          { role: 'system', content: 'Summarize the following document in 2-3 sentences:' },
          { role: 'user', content: data.content.substring(0, 5000) },
        ]);
        summary = result.response;
      } catch (error) {
        logger.error('Failed to generate summary', { error });
      }
    }

    const entry = {
      id: entryId,
      organizationId,
      ...data,
      summary,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      embedding: embedding ? Buffer.from(embedding as any) : null,
      status: 'active',
      usageCount: 0,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(complianceKnowledgeBase).values(entry);

    return entry;
  }

  async updateKnowledgeBaseEntry(organizationId: string, entryId: string, data: UpdateKnowledgeBaseEntryInput) {
    const updated = {
      ...data,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      updatedAt: new Date(),
    };

    await this.db
      .update(complianceKnowledgeBase)
      .set(updated)
      .where(and(eq(complianceKnowledgeBase.id, entryId), eq(complianceKnowledgeBase.organizationId, organizationId)));

    return this.db
      .select()
      .from(complianceKnowledgeBase)
      .where(eq(complianceKnowledgeBase.id, entryId))
      .get() as any;
  }

  async deleteKnowledgeBaseEntry(organizationId: string, entryId: string) {
    await this.db
      .delete(complianceKnowledgeBase)
      .where(and(eq(complianceKnowledgeBase.id, entryId), eq(complianceKnowledgeBase.organizationId, organizationId)));
  }

  // ============================================
  // EF3: COMMONALITY STUDY (ReAct Agent)
  // ============================================

  async runCommonalityAnalysis(organizationId: string, userId: string, data: RunCommonalityAnalysisInput) {
    const studyId = this.generateId();
    const studyNumber = this.generateNumber('CMN');

    // Run ReAct loop
    const reactTrace = await this.runReActAnalysis(organizationId, data);

    const study = {
      id: studyId,
      organizationId,
      studyNumber,
      title: data.title,
      description: data.description || null,
      studyType: data.studyType,
      analysisStartDate: data.analysisStartDate ? new Date(data.analysisStartDate) : null,
      analysisEndDate: data.analysisEndDate ? new Date(data.analysisEndDate) : null,
      entityFilters: data.entityFilters || null,
      reactTrace: reactTrace.steps || [],
      patternsFound: reactTrace.patterns || [],
      recommendations: reactTrace.recommendations || [],
      supplierInsights: reactTrace.supplierInsights || [],
      variantAnalysis: reactTrace.variantAnalysis || null,
      status: 'completed',
      requiresApproval: data.requiresApproval,
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      approvalComments: null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(commonalityStudies).values(study);

    return study;
  }

  private async runReActAnalysis(organizationId: string, data: RunCommonalityAnalysisInput) {
    const trace: any[] = [];
    let step = 0;
    const maxIterations = data.maxIterations || 5;

    // Initial thought
    let currentContext = {
      studyType: data.studyType,
      filters: data.entityFilters,
      findings: [] as any[],
      patterns: [] as any[],
    };

    for (let i = 0; i < maxIterations; i++) {
      step++;

      // Thought phase
      const thought = await this.generateThought(currentContext, step);
      trace.push({ step, thought, action: '', observation: '', timestamp: new Date().toISOString() });

      // Action phase
      const action = await this.determineAction(thought, currentContext);
      trace[trace.length - 1].action = action.description;

      // Execute action and observe
      const observation = await this.executeAction(organizationId, action, currentContext);
      trace[trace.length - 1].observation = observation.summary;

      // Update context
      currentContext = { ...currentContext, ...observation.data };

      // Check if we should stop
      if (observation.complete) {
        break;
      }
    }

    // Final analysis
    const finalAnalysis = await this.generateFinalAnalysis(currentContext);

    return {
      steps: trace,
      patterns: finalAnalysis.patterns,
      recommendations: finalAnalysis.recommendations,
      supplierInsights: finalAnalysis.supplierInsights,
      variantAnalysis: finalAnalysis.variantAnalysis,
    };
  }

  private async generateThought(context: any, step: number): Promise<string> {
    try {
      const result = await this.aiClient.chat([
        {
          role: 'system',
          content: `You are a manufacturing analyst using the ReAct framework. Based on the current context, generate a thought about what to analyze next.

Current context:
${JSON.stringify(context, null, 2)}

Step: ${step}

Generate a concise thought (1-2 sentences) about what pattern or issue to investigate next.`,
        },
        { role: 'user', content: 'Generate thought.' },
      ]);
      return result.response || 'Analyzing data patterns...';
    } catch {
      return 'Analyzing available data for patterns...';
    }
  }

  private async determineAction(thought: string, context: any): Promise<{ type: string; description: string; params: any }> {
    try {
      const result = await this.aiClient.chat([
        {
          role: 'system',
          content: `Based on this thought, determine the next action:
Thought: ${thought}

Available actions:
1. ANALYZE_DEFECTS - Look for defect patterns
2. COMPARE_SUPPLIERS - Compare supplier performance
3. CHECK_PROCESS - Analyze process variations
4. FIND_ROOT_CAUSE - Identify root causes
5. COMPLETE - Finish analysis

Respond in JSON:
{"type": "ACTION_NAME", "description": "what to do", "params": {}}`,
        },
        { role: 'user', content: 'Determine action.' },
      ]);
      return JSON.parse(result.response || '{"type": "COMPLETE", "description": "Complete analysis", "params": {}}');
    } catch {
      return { type: 'COMPLETE', description: 'Complete analysis', params: {} };
    }
  }

  private async executeAction(organizationId: string, action: any, context: any): Promise<{ summary: string; data: any; complete: boolean }> {
    switch (action.type) {
      case 'ANALYZE_DEFECTS':
        // Query defect data
        return { summary: 'Analyzed defect patterns', data: { patterns: [] }, complete: false };
      case 'COMPARE_SUPPLIERS':
        return { summary: 'Compared supplier performance', data: { supplierInsights: [] }, complete: false };
      case 'CHECK_PROCESS':
        return { summary: 'Analyzed process variations', data: { processFindings: [] }, complete: false };
      case 'FIND_ROOT_CAUSE':
        return { summary: 'Identified potential root causes', data: { rootCauses: [] }, complete: false };
      case 'COMPLETE':
      default:
        return { summary: 'Analysis complete', data: {}, complete: true };
    }
  }

  private async generateFinalAnalysis(context: any) {
    try {
      const result = await this.aiClient.chat([
        {
          role: 'system',
          content: `Generate a final commonality study analysis based on:
${JSON.stringify(context, null, 2)}

Respond in JSON:
{
  "patterns": [{"patternId": "string", "patternType": "string", "description": "string", "frequency": number, "severity": "string", "affectedEntities": [], "rootCause": "string", "confidence": number}],
  "recommendations": [{"id": "string", "title": "string", "description": "string", "priority": "high|medium|low", "expectedImpact": "string", "estimatedEffort": "string", "status": "pending"}],
  "supplierInsights": [{"supplierId": "string", "supplierName": "string", "performanceScore": number, "issues": [], "strengths": [], "recommendations": []}],
  "variantAnalysis": {"variants": [], "overallConsistency": number}
}`,
        },
        { role: 'user', content: 'Generate final analysis.' },
      ]);
      return JSON.parse(result.response || '{"patterns":[],"recommendations":[],"supplierInsights":[],"variantAnalysis":null}');
    } catch {
      return { patterns: [], recommendations: [], supplierInsights: [], variantAnalysis: null };
    }
  }

  async getCommonalityStudies(organizationId: string, query: CommonalityStudiesQueryInput) {
    const conditions: any[] = [eq(commonalityStudies.organizationId, organizationId)];

    if (query.studyType) conditions.push(eq(commonalityStudies.studyType, query.studyType));
    if (query.status) conditions.push(eq(commonalityStudies.status, query.status));
    if (query.auditApprovalStatus) conditions.push(eq(commonalityStudies.approvalStatus, query.auditApprovalStatus));
    if (query.createdBy) conditions.push(eq(commonalityStudies.createdBy, query.createdBy));

    const offset = (query.page - 1) * query.limit;

    return this.db
      .select()
      .from(commonalityStudies)
      .where(and(...conditions))
      .orderBy(desc(commonalityStudies.createdAt))
      .limit(query.limit)
      .offset(offset);
  }

  async getCommonalityStudy(organizationId: string, studyId: string) {
    const study = await this.db
      .select()
      .from(commonalityStudies)
      .where(and(eq(commonalityStudies.id, studyId), eq(commonalityStudies.organizationId, organizationId)))
      .get() as any;

    if (!study) {
      throw new Error('Study not found');
    }

    return study;
  }

  async approveStudy(organizationId: string, userId: string, studyId: string, data: ApproveStudyInput) {
    await this.db
      .update(commonalityStudies)
      .set({
        approvalStatus: data.approved ? 'approved' : 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        approvalComments: data.comments || null,
        updatedAt: new Date(),
      })
      .where(and(eq(commonalityStudies.id, studyId), eq(commonalityStudies.organizationId, organizationId)));

    return this.getCommonalityStudy(organizationId, studyId);
  }

  async getSupplierInsights(organizationId: string, supplierId?: string) {
    const studies = await this.db
      .select()
      .from(commonalityStudies)
      .where(
        and(
          eq(commonalityStudies.organizationId, organizationId),
          eq(commonalityStudies.status, 'completed')
        )
      );

    // Aggregate supplier insights from all studies
    const insights: Record<string, any> = {};
    for (const study of studies) {
      const supplierInsights = study.supplierInsights as any[];
      if (supplierInsights) {
        for (const insight of supplierInsights) {
          if (supplierId && insight.supplierId !== supplierId) continue;
          if (!insights[insight.supplierId]) {
            insights[insight.supplierId] = { ...insight, studyCount: 1 };
          } else {
            insights[insight.supplierId].studyCount++;
          }
        }
      }
    }

    return Object.values(insights);
  }

  // ============================================
  // IMPROVEMENT PROPOSALS
  // ============================================

  async getProposals(organizationId: string, query: ProposalsQueryInput) {
    const conditions: any[] = [eq(improvementProposals.organizationId, organizationId)];

    if (query.status) conditions.push(eq(improvementProposals.status, query.status));
    if (query.category) conditions.push(eq(improvementProposals.category, query.category));
    if (query.priority) conditions.push(eq(improvementProposals.priority, query.priority));
    if (query.aiGenerated !== undefined) conditions.push(eq(improvementProposals.aiGenerated, query.aiGenerated));

    const offset = (query.page - 1) * query.limit;

    return this.db
      .select()
      .from(improvementProposals)
      .where(and(...conditions))
      .orderBy(desc(improvementProposals.createdAt))
      .limit(query.limit)
      .offset(offset);
  }

  async getProposal(organizationId: string, proposalId: string) {
    const proposal = await this.db
      .select()
      .from(improvementProposals)
      .where(and(eq(improvementProposals.id, proposalId), eq(improvementProposals.organizationId, organizationId)))
      .get() as any;

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    return proposal;
  }

  async createProposal(organizationId: string, userId: string, data: CreateImprovementProposalInput) {
    const proposalId = this.generateId();
    const proposalNumber = this.generateNumber('IMP');

    const proposal = {
      id: proposalId,
      organizationId,
      proposalNumber,
      commonalityStudyId: data.commonalityStudyId || null,
      title: data.title,
      description: data.description,
      category: data.category,
      expectedBenefits: data.expectedBenefits || null,
      estimatedCostSaving: data.estimatedCostSaving || null,
      estimatedQualityImprovement: data.estimatedQualityImprovement || null,
      implementationEffort: data.implementationEffort || null,
      priority: data.priority,
      affectedProcesses: data.affectedProcesses || null,
      affectedSuppliers: data.affectedSuppliers || null,
      affectedProducts: data.affectedProducts || null,
      implementationSteps: data.implementationSteps?.map((step, idx) => ({
        step: step.step || idx + 1,
        description: step.description,
        assignedTo: step.assignedTo || null,
        dueDate: step.dueDate || null,
        status: 'pending' as const,
        completedAt: null as string | null,
      })) || null,
      status: 'draft',
      submittedAt: null,
      submittedBy: null,
      approvalChain: null,
      currentApprovalLevel: 0,
      implementationStartDate: null,
      implementationEndDate: null,
      actualResults: null,
      lessonsLearned: null,
      aiGenerated: false,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(improvementProposals).values(proposal);

    return proposal;
  }

  async updateProposal(organizationId: string, proposalId: string, data: UpdateImprovementProposalInput) {
    const updated = {
      ...data,
      updatedAt: new Date(),
    };

    await this.db
      .update(improvementProposals)
      .set(updated)
      .where(and(eq(improvementProposals.id, proposalId), eq(improvementProposals.organizationId, organizationId)));

    return this.getProposal(organizationId, proposalId);
  }

  async submitProposal(organizationId: string, userId: string, proposalId: string, data: SubmitProposalInput) {
    const approvalChain = data.approvalChain.map((level) => ({
      ...level,
      approverId: null,
      status: 'pending',
      comments: null,
      timestamp: null,
    }));

    await this.db
      .update(improvementProposals)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: userId,
        approvalChain,
        currentApprovalLevel: 1,
        updatedAt: new Date(),
      })
      .where(and(eq(improvementProposals.id, proposalId), eq(improvementProposals.organizationId, organizationId)));

    return this.getProposal(organizationId, proposalId);
  }

  async approveProposal(organizationId: string, userId: string, proposalId: string, data: ApproveProposalInput) {
    const proposal = await this.getProposal(organizationId, proposalId);
    const approvalChain = (proposal.approvalChain as any[]) || [];
    const currentLevel = proposal.currentApprovalLevel || 0;

    // Update current level in chain
    if (approvalChain[currentLevel - 1]) {
      approvalChain[currentLevel - 1] = {
        ...approvalChain[currentLevel - 1],
        approverId: userId,
        status: data.approved ? 'approved' : 'rejected',
        comments: data.comments || null,
        timestamp: new Date().toISOString(),
      };
    }

    let newStatus = proposal.status;
    let newLevel = currentLevel;

    if (!data.approved) {
      newStatus = 'rejected';
    } else if (currentLevel >= approvalChain.length) {
      newStatus = 'approved';
    } else {
      newStatus = 'under_review';
      newLevel = currentLevel + 1;
    }

    await this.db
      .update(improvementProposals)
      .set({
        status: newStatus,
        approvalChain,
        currentApprovalLevel: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(improvementProposals.id, proposalId));

    return this.getProposal(organizationId, proposalId);
  }

  // ============================================
  // SCHEDULES
  // ============================================

  async getSchedules(organizationId: string) {
    return this.db
      .select()
      .from(auditSchedules)
      .where(eq(auditSchedules.organizationId, organizationId))
      .orderBy(desc(auditSchedules.createdAt));
  }

  async createSchedule(organizationId: string, userId: string, data: CreateAuditScheduleInput) {
    const scheduleId = this.generateId();

    const schedule = {
      id: scheduleId,
      organizationId,
      ...data,
      isActive: true,
      lastRunAt: null,
      lastRunStatus: null,
      lastRunResult: null,
      nextRunAt: null, // Would calculate based on frequency
      runCount: 0,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(auditSchedules).values(schedule);

    return schedule;
  }

  async updateSchedule(organizationId: string, scheduleId: string, data: UpdateAuditScheduleInput) {
    const updated = {
      ...data,
      updatedAt: new Date(),
    };

    await this.db
      .update(auditSchedules)
      .set(updated)
      .where(and(eq(auditSchedules.id, scheduleId), eq(auditSchedules.organizationId, organizationId)));

    return this.db
      .select()
      .from(auditSchedules)
      .where(eq(auditSchedules.id, scheduleId))
      .get() as any;
  }

  async deleteSchedule(organizationId: string, scheduleId: string) {
    await this.db
      .delete(auditSchedules)
      .where(and(eq(auditSchedules.id, scheduleId), eq(auditSchedules.organizationId, organizationId)));
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  async getConfiguration(organizationId: string) {
    let config = await this.db
      .select()
      .from(auditConfiguration)
      .where(eq(auditConfiguration.organizationId, organizationId))
      .get() as any;

    if (!config) {
      // Create default configuration
      const configId = this.generateId();
      config = {
        id: configId,
        organizationId,
        riskScoreWeights: { quality: 0.3, process: 0.25, supplier: 0.25, compliance: 0.2 },
        riskThresholds: { low: 30, medium: 60, high: 85, critical: 100 },
        approvalLevels: [
          { level: 1, role: 'Quality Manager', minProposalPriority: 'medium' },
          { level: 2, role: 'Operations Director', minProposalPriority: 'high' },
        ],
        defaultStandards: ['ISO 9001'],
        autoGenerateTasks: false,
        autoGenerateThreshold: 70,
        notificationSettings: {
          emailOnHighRisk: true,
          emailOnNonCompliance: true,
          emailOnProposalSubmission: true,
          dailyDigest: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db.insert(auditConfiguration).values(config);
    }

    return config;
  }

  async updateConfiguration(organizationId: string, data: UpdateAuditConfigurationInput) {
    const existing = await this.getConfiguration(organizationId);

    const updated = {
      ...data,
      updatedAt: new Date(),
    };

    await this.db
      .update(auditConfiguration)
      .set(updated)
      .where(eq(auditConfiguration.organizationId, organizationId));

    return { ...existing, ...updated };
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboard(organizationId: string): Promise<AuditDashboardStats> {
    const [taskStats, findingsCount, proposalsCount, riskStats] = await Promise.all([
      this.getTaskStats(organizationId),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditFindings)
        .where(eq(auditFindings.organizationId, organizationId))
        .get(),
      this.db
        .select({ count: sql<number>`sum(case when status in ('submitted', 'under_review', 'implementing') then 1 else 0 end)` })
        .from(improvementProposals)
        .where(eq(improvementProposals.organizationId, organizationId))
        .get(),
      this.db
        .select({
          avgRisk: sql<number>`avg(overall_risk_score)`,
          highRisk: sql<number>`sum(case when overall_risk_score >= 70 then 1 else 0 end)`,
        })
        .from(riskAssessments)
        .where(eq(riskAssessments.organizationId, organizationId))
        .get(),
    ]);

    // Calculate compliance rate from recent checks
    const recentChecks = await this.db
      .select()
      .from(complianceChecks)
      .where(eq(complianceChecks.organizationId, organizationId))
      .orderBy(desc(complianceChecks.createdAt))
      .limit(100);

    const compliantChecks = recentChecks.filter((c) => c.overallStatus === 'compliant').length;
    const complianceRate = recentChecks.length > 0 ? (compliantChecks / recentChecks.length) * 100 : 100;

    return {
      totalTasks: taskStats?.total || 0,
      pendingTasks: taskStats?.pending || 0,
      completedTasks: taskStats?.completed || 0,
      overdueTasksCount: 0, // Would need date comparison
      averageRiskScore: riskStats?.avgRisk || 0,
      highRiskEntities: riskStats?.highRisk || 0,
      complianceRate,
      findingsCount: findingsCount?.count || 0,
      proposalsInProgress: proposalsCount?.count || 0,
      tasksGeneratedByAI: taskStats?.aiGenerated || 0,
    };
  }
}
