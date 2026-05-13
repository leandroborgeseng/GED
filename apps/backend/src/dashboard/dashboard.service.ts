import { Injectable } from '@nestjs/common';
import { MayanService } from '../mayan/mayan.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly mayan: MayanService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async summary(tenantId: string) {
    const [users, docPage, storage, recentAudits] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.mayan.listDocuments(1, 5).catch(() => ({ count: 0, results: [] as unknown[] })),
      this.storage.status(),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);
    return {
      documentCount: docPage.count,
      recentDocuments: docPage.results,
      userCount: users,
      storage,
      recentActivity: recentAudits,
      workflowPending: 0,
      ocrProcessed: docPage.count,
    };
  }
}
