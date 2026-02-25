import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';
import { ApiError } from '../../utils/api-error.js';
import { buildProjectContext } from './ai.context.js';
import { buildSystemPrompt } from './ai.prompts.js';
import type { AIChatMessage } from '@pm/shared';

// ──────────────────────────────────────────────
// Gemini client (lazy-initialized, mirrors email.service.ts pattern)
// ──────────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAI;
}

/** Override the Gemini client (for testing). */
export function setGenAIClient(client: GoogleGenerativeAI | null): void {
  genAI = client;
}

function getModel(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      maxOutputTokens: 2048,
    },
  });
}

function ensureAvailable(): void {
  if (!env.GEMINI_API_KEY) {
    throw ApiError.badRequest('AI not configured');
  }
}

// ──────────────────────────────────────────────
// AI Service
// ──────────────────────────────────────────────

export const aiService = {
  /** Check if Gemini API is configured */
  isAvailable(): boolean {
    return !!env.GEMINI_API_KEY;
  },

  /** Non-streaming chat with project context */
  async chat(
    projectId: string,
    _userId: string,
    message: string,
    history?: AIChatMessage[],
  ): Promise<{ message: string }> {
    ensureAvailable();

    try {
      const context = await buildProjectContext(projectId);
      const systemPrompt = buildSystemPrompt(context);
      const model = getModel();

      const chat = model.startChat({
        systemInstruction: systemPrompt,
        history: (history || []).map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      const responseText = result.response.text();

      return { message: responseText };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logger.error(`AI chat error: ${errMessage}`);

      if (errMessage.includes('429') || errMessage.includes('quota')) {
        throw ApiError.tooManyRequests('AI rate limit exceeded. Please try again later.');
      }
      if (errMessage.includes('SAFETY')) {
        return { message: 'I cannot respond to that request due to content safety guidelines.' };
      }

      throw ApiError.badRequest('AI request failed. Please try again.');
    }
  },

  /** Streaming chat with project context — returns async iterable of text chunks */
  async *chatStream(
    projectId: string,
    _userId: string,
    message: string,
    history?: AIChatMessage[],
  ): AsyncGenerator<string> {
    ensureAvailable();

    const context = await buildProjectContext(projectId);
    const systemPrompt = buildSystemPrompt(context);
    const model = getModel();

    const chat = model.startChat({
      systemInstruction: systemPrompt,
      history: (history || []).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  },
};

export default aiService;
