import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Preparado para OpenSearch/Elasticsearch — implementação real em fase posterior. */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly config: ConfigService) {}

  async globalSearch(_tenantId: string, query: string) {
    const url = this.config.get<string>('OPENSEARCH_URL');
    if (!url) {
      this.logger.debug(`Busca avançada (stub) para: ${query}`);
      return { engine: 'stub', hits: [] as { id: string; title: string; snippet: string }[] };
    }
    return { engine: 'opensearch', hits: [] as { id: string; title: string; snippet: string }[] };
  }
}
