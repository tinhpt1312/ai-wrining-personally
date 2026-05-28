import { Module } from '@nestjs/common';
import { OpenAiProvider } from './providers/openai.provider';
import { PromptTemplatesService } from './services/prompt-templates.service';

@Module({
  providers: [OpenAiProvider, PromptTemplatesService],
  exports: [OpenAiProvider, PromptTemplatesService],
})
export class AiModule {}
