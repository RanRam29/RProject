import apiClient from './client';
import { env } from '../config/env';
import type {
  AIChatRequest,
  AIChatResponse,
  AIStatusResponse,
  AIStreamChunk,
  ApiResponse,
} from '@pm/shared';

export const aiApi = {
  /** Check if AI backend is available */
  async getStatus(projectId: string): Promise<AIStatusResponse> {
    const res = await apiClient.get<ApiResponse<AIStatusResponse>>(
      `/projects/${projectId}/ai/status`
    );
    return res.data.data!;
  },

  /** Non-streaming chat */
  async chat(projectId: string, data: AIChatRequest): Promise<AIChatResponse> {
    const res = await apiClient.post<ApiResponse<AIChatResponse>>(
      `/projects/${projectId}/ai/chat`,
      data
    );
    return res.data.data!;
  },

  /** Streaming chat using fetch + ReadableStream (SSE) */
  async chatStream(
    projectId: string,
    data: AIChatRequest,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void,
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${env.API_URL}/projects/${projectId}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      onError(`AI request failed (${response.status})`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('Stream not available');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              if (chunk.error) {
                onError(chunk.error);
                return;
              }
              if (chunk.done) {
                onDone();
                return;
              }
              if (chunk.text) {
                onChunk(chunk.text);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Stream failed');
    }
  },
};
