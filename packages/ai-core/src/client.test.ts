/**
 * AI Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIClient } from './client';
import { AI_MODELS } from './types';

// Mock AI binding
const mockAi = {
  run: vi.fn(),
};

describe('AIClient', () => {
  let client: AIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AIClient(mockAi as any);
  });

  describe('chat', () => {
    it('should send chat request with default options', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'Hello! How can I help?',
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
      });

      const result = await client.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(mockAi.run).toHaveBeenCalledWith(
        AI_MODELS.chat.llama3_8b,
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 2048,
          stream: false,
        })
      );
      expect(result.response).toBe('Hello! How can I help?');
      expect(result.usage).toBeDefined();
    });

    it('should use custom options when provided', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'Custom response',
      });

      await client.chat(
        [{ role: 'user', content: 'Test' }],
        { temperature: 0.5, max_tokens: 500 }
      );

      expect(mockAi.run).toHaveBeenCalledWith(
        AI_MODELS.chat.llama3_8b,
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 500,
        })
      );
    });

    it('should handle system messages', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'I am a helpful assistant.',
      });

      await client.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Who are you?' },
      ]);

      expect(mockAi.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Who are you?' },
          ],
        })
      );
    });
  });

  describe('embed', () => {
    it('should generate embeddings for single text', async () => {
      mockAi.run.mockResolvedValueOnce({
        data: [[0.1, 0.2, 0.3]],
        shape: [1, 3],
      });

      const result = await client.embed('Test text');

      expect(mockAi.run).toHaveBeenCalledWith(
        AI_MODELS.embedding.bge_base,
        { text: ['Test text'] }
      );
      expect(result.data).toEqual([[0.1, 0.2, 0.3]]);
    });

    it('should generate embeddings for multiple texts', async () => {
      mockAi.run.mockResolvedValueOnce({
        data: [[0.1, 0.2], [0.3, 0.4]],
        shape: [2, 2],
      });

      const result = await client.embed(['Text 1', 'Text 2']);

      expect(mockAi.run).toHaveBeenCalledWith(
        AI_MODELS.embedding.bge_base,
        { text: ['Text 1', 'Text 2'] }
      );
      expect(result.data).toHaveLength(2);
    });
  });

  describe('summarize', () => {
    it('should summarize text with default options', async () => {
      mockAi.run.mockResolvedValueOnce({
        summary: 'This is a summary.',
      });

      const result = await client.summarize('Long text here...');

      expect(mockAi.run).toHaveBeenCalledWith(
        AI_MODELS.summarization.bart,
        expect.objectContaining({
          input_text: 'Long text here...',
          max_length: 1024,
        })
      );
      expect(result).toBe('This is a summary.');
    });

    it('should respect custom max_length', async () => {
      mockAi.run.mockResolvedValueOnce({
        summary: 'Short summary.',
      });

      await client.summarize('Long text...', { max_length: 256 });

      expect(mockAi.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          max_length: 256,
        })
      );
    });
  });

  describe('extractData', () => {
    it('should extract structured data from text', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: '{"name": "John", "age": 30}',
      });

      const result = await client.extractData<{ name: string; age: number }>(
        'John is 30 years old',
        '{"name": "string", "age": "number"}'
      );

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should throw error for invalid JSON response', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'This is not JSON',
      });

      await expect(
        client.extractData('Some text', '{}')
      ).rejects.toThrow('Failed to parse AI response as JSON');
    });
  });

  describe('classify', () => {
    it('should classify text into categories', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: '{"category": "positive", "confidence": 0.95}',
      });

      const result = await client.classify(
        'This is great!',
        ['positive', 'negative', 'neutral']
      );

      expect(result).toEqual({ category: 'positive', confidence: 0.95 });
    });

    it('should throw error for invalid classification response', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'invalid response',
      });

      await expect(
        client.classify('Text', ['a', 'b'])
      ).rejects.toThrow('Failed to parse classification response');
    });
  });

  describe('generate', () => {
    it('should generate text from prompt', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'Generated content here',
      });

      const result = await client.generate('Write a poem');

      expect(result).toBe('Generated content here');
    });

    it('should use system prompt when provided', async () => {
      mockAi.run.mockResolvedValueOnce({
        response: 'Creative response',
      });

      await client.generate('Write something', 'You are a creative writer');

      expect(mockAi.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a creative writer' },
            { role: 'user', content: 'Write something' },
          ],
        })
      );
    });
  });
});

describe('AI_MODELS', () => {
  it('should have chat models defined', () => {
    expect(AI_MODELS.chat).toBeDefined();
    expect(AI_MODELS.chat.llama3_8b).toBeDefined();
  });

  it('should have embedding models defined', () => {
    expect(AI_MODELS.embedding).toBeDefined();
    expect(AI_MODELS.embedding.bge_base).toBeDefined();
  });

  it('should have summarization models defined', () => {
    expect(AI_MODELS.summarization).toBeDefined();
    expect(AI_MODELS.summarization.bart).toBeDefined();
  });
});
