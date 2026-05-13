import { BadRequestException, Injectable } from '@nestjs/common';
import { MayanService } from '../mayan/mayan.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly mayan: MayanService,
    private readonly audit: AuditService,
  ) {}

  list(_tenantId: string, _userId: string, page = 1, pageSize = 25) {
    return this.mayan.listDocuments(page, pageSize);
  }

  async get(tenantId: string, userId: string, id: number) {
    const doc = await this.mayan.getDocument(id);
    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_VIEW',
      resource: 'document',
      resourceId: String(id),
    });
    return doc;
  }

  async download(tenantId: string, userId: string, id: number) {
    const file = await this.mayan.downloadLatestFile(id);
    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_DOWNLOAD',
      resource: 'document',
      resourceId: String(id),
      metadata: { filename: file.filename },
    });
    return file;
  }

  async upload(tenantId: string, userId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const created = await this.mayan.uploadDocument(file);
    await this.audit.log({
      tenantId,
      userId,
      action: 'DOCUMENT_UPLOAD',
      resource: 'document',
      metadata: { filename: file.originalname },
    });
    return created;
  }

  ocrStatus(tenantId: string, userId: string, id: number) {
    return this.mayan.getOcrStatus(id).then(async (s) => {
      await this.audit.log({
        tenantId,
        userId,
        action: 'DOCUMENT_OCR_STATUS',
        resource: 'document',
        resourceId: String(id),
      });
      return s;
    });
  }

  workflows(tenantId: string, userId: string, id: number) {
    return this.mayan.getWorkflows(id).then(async (w) => {
      await this.audit.log({
        tenantId,
        userId,
        action: 'DOCUMENT_WORKFLOWS',
        resource: 'document',
        resourceId: String(id),
      });
      return w;
    });
  }
}
