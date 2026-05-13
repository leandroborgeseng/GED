import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export type PaperlessDocumentListItem = {
  id: number;
  label?: string;
  description?: string;
  datetime_created?: string;
  file_latest?: { id: number; filename: string; size: number; mimetype?: string };
  document_type?: { id: number; label: string };
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type PaperlessTaskRow = {
  status?: string;
  result?: string;
  related_document?: number | string | null;
  task_id?: string;
};

@Injectable()
export class PaperlessService {
  private readonly logger = new Logger(PaperlessService.name);
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(private readonly config: ConfigService) {
    const root = (
      this.config.get<string>('PAPERLESS_API_URL') ??
      this.config.get<string>('PAPERLESS_URL') ??
      'http://localhost:8010'
    ).replace(/\/$/, '');
    this.client = axios.create({
      baseURL: `${root}/api`,
      timeout: 120000,
    });
  }

  private assertConfigured() {
    const token = this.config.get<string>('PAPERLESS_TOKEN');
    const user = this.config.get<string>('PAPERLESS_USERNAME');
    const pass = this.config.get<string>('PAPERLESS_PASSWORD');
    if (token?.trim()) return;
    if (!user || !pass) {
      throw new ServiceUnavailableException(
        'Paperless-ngx não configurado: defina PAPERLESS_TOKEN ou PAPERLESS_USERNAME / PAPERLESS_PASSWORD.',
      );
    }
  }

  private async authenticate(): Promise<void> {
    this.assertConfigured();
    const preset = this.config.get<string>('PAPERLESS_TOKEN');
    if (preset?.trim()) {
      this.token = preset.trim();
      this.client.defaults.headers.common.Authorization = `Token ${this.token}`;
      return;
    }
    const username = this.config.get<string>('PAPERLESS_USERNAME')!;
    const password = this.config.get<string>('PAPERLESS_PASSWORD')!;
    try {
      const { data } = await this.client.post<{ token: string }>('/token/', {
        username,
        password,
      });
      this.token = data.token;
      this.client.defaults.headers.common.Authorization = `Token ${this.token}`;
    } catch (e) {
      this.logger.error('Falha ao autenticar no Paperless-ngx', e as Error);
      throw new ServiceUnavailableException('Não foi possível autenticar no Paperless-ngx.');
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.token) await this.authenticate();
  }

  private mapListItem(d: Record<string, unknown>): PaperlessDocumentListItem {
    const id = Number(d.id);
    const title = String(d.title ?? '');
    const created = (d.created ?? d.added ?? '') as string;
    const mime = d.mime_type as string | undefined;
    const fname = String(
      (d.original_file_name ?? d.archived_file_name ?? d.source_filename ?? title) || `documento-${id}`,
    );
    const size = Number(d.size ?? 0) || 0;
    let docType: { id: number; label: string } | undefined;
    const rawDt = d.document_type;
    if (rawDt && typeof rawDt === 'object') {
      const o = rawDt as Record<string, unknown>;
      docType = {
        id: Number(o.id ?? 0),
        label: String(o.name ?? o.slug ?? ''),
      };
    }
    return {
      id,
      label: title || fname,
      description: typeof d.content === 'string' ? d.content.slice(0, 280) : undefined,
      datetime_created: created,
      file_latest: { id, filename: fname, size, mimetype: mime },
      document_type: docType?.label ? docType : undefined,
    };
  }

  /** Expõe metadados no formato esperado pelo frontend legado (label / file_latest). */
  private mapDetail(d: Record<string, unknown>): Record<string, unknown> {
    const mapped = this.mapListItem(d);
    return {
      ...d,
      label: mapped.label,
      file_latest: mapped.file_latest,
      datetime_created: mapped.datetime_created,
      document_type: mapped.document_type,
    };
  }

  async listDocuments(
    page = 1,
    pageSize = 25,
  ): Promise<{ count: number; results: PaperlessDocumentListItem[] }> {
    await this.ensureClient();
    try {
      const { data } = await this.client.get<{ count?: number; results?: Record<string, unknown>[] }>(
        '/documents/',
        { params: { page, page_size: pageSize } },
      );
      const raw = data.results ?? [];
      return {
        count: data.count ?? raw.length,
        results: raw.map((r) => this.mapListItem(r)),
      };
    } catch (e) {
      this.logger.warn('listDocuments falhou; retornando lista vazia', e as Error);
      return { count: 0, results: [] };
    }
  }

  async getDocument(id: number): Promise<unknown> {
    await this.ensureClient();
    const { data } = await this.client.get<Record<string, unknown>>(`/documents/${id}/`);
    return this.mapDetail(data);
  }

  async downloadLatestFile(documentId: number): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    await this.ensureClient();
    const meta = (await this.client.get<Record<string, unknown>>(`/documents/${documentId}/`)).data;
    const mapped = this.mapListItem(meta);
    const res = await this.client.get<ArrayBuffer>(`/documents/${documentId}/download/`, {
      responseType: 'arraybuffer',
    });
    const filename = mapped.file_latest?.filename ?? 'download';
    const mimetype = mapped.file_latest?.mimetype ?? 'application/octet-stream';
    return { buffer: Buffer.from(res.data), filename, mimetype };
  }

  private parseTaskIdFromPostResponse(data: unknown): string | null {
    if (typeof data === 'string') {
      const s = data.trim().replace(/^"|"$/g, '');
      if (/^[0-9a-f-]{36}$/i.test(s)) return s;
      return null;
    }
    if (data && typeof data === 'object' && 'task_id' in (data as object)) {
      const tid = (data as { task_id?: unknown }).task_id;
      if (typeof tid === 'string' && tid.length > 0) return tid;
    }
    return null;
  }

  private parseDocumentIdFromPostResponse(data: unknown): number | null {
    if (data && typeof data === 'object' && 'id' in (data as object)) {
      const id = (data as { id?: unknown }).id;
      if (typeof id === 'number' && Number.isFinite(id)) return id;
    }
    return null;
  }

  private async waitForDocumentIdFromTask(taskId: string): Promise<number> {
    for (let i = 0; i < 120; i++) {
      const { data } = await this.client.get<{ results?: PaperlessTaskRow[]; count?: number }>(
        '/tasks/',
        { params: { task_id: taskId, page_size: 5 } },
      );
      const rows = data.results ?? [];
      const row = rows.find((r) => r.task_id === taskId) ?? rows[0];
      if (row) {
        const st = String(row.status ?? '').toUpperCase();
        if (st === 'FAILURE') {
          throw new ServiceUnavailableException(
            `Paperless falhou ao processar o arquivo: ${row.result ?? 'sem detalhe'}`,
          );
        }
        if (st === 'SUCCESS') {
          const rel = row.related_document;
          if (rel != null && rel !== '') {
            const n = typeof rel === 'number' ? rel : Number(rel);
            if (Number.isFinite(n)) return n;
          }
          const msg = String(row.result ?? '');
          const m = msg.match(/document id (\d+)/i) ?? msg.match(/New document id (\d+)/i);
          if (m?.[1]) return Number(m[1]);
        }
      }
      await sleep(1000);
    }
    throw new ServiceUnavailableException('Timeout aguardando o Paperless-ngx processar o documento.');
  }

  async uploadDocument(file: Express.Multer.File): Promise<{ id: number }> {
    await this.ensureClient();
    const form = new FormData();
    form.append('document', file.buffer, { filename: file.originalname });
    if (file.originalname) {
      form.append('title', file.originalname);
    }
    const { data, status } = await this.client.post<unknown>('/documents/post_document/', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const directId = this.parseDocumentIdFromPostResponse(data);
    if (directId != null) return { id: directId };
    const taskId = this.parseTaskIdFromPostResponse(data);
    if (taskId) {
      const id = await this.waitForDocumentIdFromTask(taskId);
      return { id };
    }
    this.logger.error('Resposta inesperada do post_document', { status, data });
    throw new ServiceUnavailableException('Upload no Paperless-ngx não retornou task nem id de documento.');
  }

  async getOcrStatus(documentId: number): Promise<{ status: string; detail?: unknown }> {
    await this.ensureClient();
    try {
      const { data } = await this.client.get<Record<string, unknown>>(`/documents/${documentId}/`);
      const content = data.content;
      const hasText = typeof content === 'string' && content.trim().length > 0;
      return { status: hasText ? 'available' : 'unknown', detail: this.mapDetail(data) };
    } catch {
      return { status: 'unavailable' };
    }
  }

  async getWorkflows(_documentId: number): Promise<unknown[]> {
    return [];
  }
}
