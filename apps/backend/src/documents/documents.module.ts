import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MayanModule } from '../mayan/mayan.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [MayanModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
