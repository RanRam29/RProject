/** Message in the AI conversation history */
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Request to the AI chat endpoint */
export interface AIChatRequest {
  message: string;
  history?: AIChatMessage[];
}

/** Response from the AI chat endpoint (non-streaming) */
export interface AIChatResponse {
  message: string;
}

/** AI availability status */
export interface AIStatusResponse {
  available: boolean;
}

/** SSE chunk for streaming responses */
export interface AIStreamChunk {
  text?: string;
  done?: boolean;
  error?: string;
}
