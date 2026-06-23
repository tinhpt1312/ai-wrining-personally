import { Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { PromptTemplatesService } from './services/prompt-templates.service';

@Module({
  providers: [GeminiProvider, PromptTemplatesService],
  exports: [GeminiProvider, PromptTemplatesService],
})
export class AiModule {}
