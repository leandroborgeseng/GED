import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export type MayanDocumentListItem = {
  id: number;
  label?: string;
  description?: string;
  datetime_created?: string;
  file_latest?: { id: number; filename: string; size: number; mimetype?: string };
  document_type?: { id: number; label: string };
  version_active?: { id: number; comment?: string };
};

@Injectable()
export class MayanService {
  private readonly logger = new Logger(MayanService.name);
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('MAYAN_API_URL', 'http://localhost:8000/api/v4');
    this.client = axios.create({
      baseURL: baseURL.replace(/\/$/, ''),
      timeout: 60000,
    });
  }

  private assertConfigured() {
    const user = this.config.get<string>('MAYAN_USERNAME');
    const pass = this.config.get<string>('MAYAN_PASSWORD');
    if (!user || !pass) {
      throw new ServiceUnavailableException(
        'Mayan EDMS não configurado (MAYAN_USERNAME / MAYAN_PASSWORD).',
      );
    }
  }

  private async authenticate(): Promise<void> {
    this.assertConfigured();
    const username = this.config.get<string>('MAYAN_USERNAME')!;
    const password = this.config.get<string>('MAYAN_PASSWORD')!;
    try {
      const { data } = await this.client.post<{ token: string }>('/auth/token/obtain/', {
        username,
        password,
      });
      this.token = data.token;
      this.client.defaults.headers.common.Authorization = `Token ${this.token}`;
    } catch (e) {
      this.logger.error('Falha ao autenticar no Mayan', e as Error);
      throw new ServiceUnavailableException('Não foi possível autenticar no Mayan EDMS.');
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.token) await this.authenticate();
  }

  async listDocuments(page = 1, pageSize = 25): Promise<{ count: number; results: MayanDocumentListItem[] }> {
    await this.ensureClient();
    try {
      const { data } = await this.client.get<{ count: number; results: MayanDocumentListItem[] }>(
        '/documents/',
        { params: { page, page_size: pageSize } },
      );
      return { count: data.count ?? data.results?.length ?? 0, results: data.results ?? [] };
    } catch (e) {
      this.logger.warn('listDocuments falhou; retornando lista vazia para desenvolvimento', e as Error);
      return { count: 0, results: [] };
    }
  }

  async getDocument(id: number): Promise<unknown> {
    await this.ensureClient();
    const { data } = await this.client.get(`/documents/${id}/`);
    return data;
  }

  async downloadLatestFile(documentId: number): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    await this.ensureClient();
    const doc = (await this.client.get(`/documents/${documentId}/`)) as {
      data: { file_latest?: { id: number; filename: string; mimetype?: string } };
    };
    const fileId = doc.data.file_latest?.id;
    if (!fileId) throw new ServiceUnavailableException('Documento sem arquivo no Mayan.');
    const res = await this.client.get<ArrayBuffer>(`/documents/${documentId}/files/${fileId}/download/`, {
      responseType: 'arraybuffer',
    });
    const filename = doc.data.file_latest?.filename ?? 'download';
    const mimetype = doc.data.file_latest?.mimetype ?? 'application/octet-stream';
    return { buffer: Buffer.from(res.data), filename, mimetype };
  }

  async uploadDocument(file: Express.Multer.File): Promise<unknown> {
    await this.ensureClient();
    const documentTypeId = this.config.get<string>('MAYAN_DOCUMENT_TYPE_ID');
    if (!documentTypeId) {
      throw new ServiceUnavailableException('Defina MAYAN_DOCUMENT_TYPE_ID para upload.');
    }
    const form = new FormData();
    form.append('document_type_id', documentTypeId);
    form.append('file', file.buffer, { filename: file.originalname });
    const { data } = await this.client.post('/documents/', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return data;
  }

  async getOcrStatus(documentId: number): Promise<{ status: string; detail?: unknown }> {
    await this.ensureClient();
    try {
      const { data } = await this.client.get(`/documents/${documentId}/`);
      return { status: 'unknown', detail: data };
    } catch {
      return { status: 'unavailable' };
    }
  }

  async getWorkflows(documentId: number): Promise<unknown[]> {
    await this.ensureClient();
    try {
      const { data } = await this.client.get<{ results?: unknown[] }>(
        `/documents/${documentId}/workflows/`,
      );
      return data.results ?? [];
    } catch {
      return [];
    }
  }

  async addTag(documentId: number, tagId: number): Promise<void> {
    await this.ensureClient();
    await this.client.post(`/documents/${documentId}/tags/attach/`, { tag: tagId });
  }
}
