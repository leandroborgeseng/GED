import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  @Get('capabilities')
  capabilities() {
    return {
      ocrInteligente: { status: 'planejado', endpoint: null },
      resumoAutomatico: { status: 'mock' },
      chatbotDocumental: { status: 'mock' },
      rag: { status: 'planejado' },
      classificacao: { status: 'planejado' },
      extracaoEntidades: { status: 'planejado' },
    };
  }

  @Get('mock/summary')
  mockSummary() {
    return {
      title: 'Resumo (mock)',
      bullets: [
        'Integração futura com modelo de linguagem e índice vetorial.',
        'Pipeline OCR e metadados permanecem no Mayan EDMS.',
      ],
    };
  }
}
