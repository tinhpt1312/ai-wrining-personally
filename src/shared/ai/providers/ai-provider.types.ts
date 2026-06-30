export interface AiProviderRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export interface AiProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  finishReason?: string | null;
}
