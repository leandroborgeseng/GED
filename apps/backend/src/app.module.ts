import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PaperlessModule } from './paperless/paperless.module';
import { DocumentsModule } from './documents/documents.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { PaeModule } from './pae/pae.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    PaperlessModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    PaeModule,
    DocumentsModule,
    DashboardModule,
    AuditModule,
    SearchModule,
    AiModule,
    WorkflowsModule,
    HealthModule,
  ],
})
export class AppModule {}
