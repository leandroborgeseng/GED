import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PaperlessModule } from '../paperless/paperless.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PaperlessModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
