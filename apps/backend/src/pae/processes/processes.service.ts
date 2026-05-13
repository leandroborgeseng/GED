import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfidentialityLevel,
  Prisma,
  ProcessMovementKind,
  ProcessSignatureMethod,
  ProcessSignatureStatus,
  ProcessStatus,
  SystemRole,
  UserSignaturePolicy,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaperlessService } from '../../paperless/paperless.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { buildA1SignaturePayload, verifyA1DetachedSignature } from '../lib/a1-signature';

@Injectable()
export class ProcessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paperless: PaperlessService,
  ) {}

  private async nextProcessNumber(tenantId: string) {
    const year = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.processNumberCounter.findUnique({
        where: { tenantId_year_prefix: { tenantId, year, prefix: 'PAE' } },
      });
      const next = (row?.lastValue ?? 0) + 1;
      await tx.processNumberCounter.upsert({
        where: { tenantId_year_prefix: { tenantId, year, prefix: 'PAE' } },
        create: { tenantId, year, prefix: 'PAE', lastValue: next },
        update: { lastValue: next },
      });
      return { year, number: String(next).padStart(5, '0') };
    });
  }

  private async notifyUser(params: {
    tenantId: string;
    userId: string;
    title: string;
    body?: string;
    link?: string;
  }) {
    await this.prisma.internalNotification.create({ data: params });
  }

  private async auditProcess(processId: string, userId: string | null, action: string, metadata?: object) {
    await this.prisma.processAuditLog.create({
      data: { processId, userId, action, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  private async assertProcessAccess(process: { confidentiality: ConfidentialityLevel; openedById: string }, user: AuthUser) {
    if (user.role === SystemRole.ADMIN) return;
    if (process.confidentiality === ConfidentialityLevel.SIGILOSO) {
      const opener = await this.prisma.user.findUnique({
        where: { id: process.openedById },
        select: { organizationId: true },
      });
      if (opener?.organizationId && user.unitId) {
        const u = await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { organizationId: true },
        });
        if (u?.organizationId !== opener.organizationId) {
          throw new ForbiddenException('Processo sigiloso: acesso restrito à mesma secretaria.');
        }
      }
    }
  }

  async create(
    user: AuthUser,
    dto: {
      processTypeId: string;
      subject: string;
      interestedParty?: string;
      confidentiality?: ConfidentialityLevel;
      asDraft?: boolean;
      unitId?: string;
    },
  ) {
    const unitId = dto.unitId ?? user.unitId;
    if (!unitId) throw new BadRequestException('Usuário sem setor (unitId). Vincule um setor ao usuário.');
    const type = await this.prisma.processType.findFirst({
      where: { id: dto.processTypeId, tenantId: user.tenantId, active: true },
    });
    if (!type) throw new NotFoundException('Tipo de processo não encontrado');
    const { number, year } = await this.nextProcessNumber(user.tenantId);
    const status: ProcessStatus = dto.asDraft ? ProcessStatus.RASCUNHO : ProcessStatus.ABERTO;
    const process = await this.prisma.process.create({
      data: {
        tenantId: user.tenantId,
        processTypeId: dto.processTypeId,
        number,
        year,
        subject: dto.subject,
        interestedParty: dto.interestedParty,
        confidentiality: dto.confidentiality ?? ConfidentialityLevel.PUBLICO,
        status,
        currentUnitId: unitId,
        openedById: user.userId,
        movements: {
          create: {
            fromUnitId: null,
            toUnitId: unitId,
            kind: ProcessMovementKind.ABERTURA,
            summary: 'Abertura do processo administrativo',
            createdById: user.userId,
            acknowledgedAt: new Date(),
          },
        },
      },
      include: { processType: true, currentUnit: true, openedBy: { select: { name: true, email: true } } },
    });
    await this.auditProcess(process.id, user.userId, 'ABERTURA', { number, year });
    return process;
  }

  async search(
    user: AuthUser,
    q: {
      status?: ProcessStatus;
      unitId?: string;
      organizationId?: string;
      interestedParty?: string;
      overdue?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 20, 100);
    const where: Prisma.ProcessWhereInput = { tenantId: user.tenantId };
    if (q.status) where.status = q.status;
    if (q.unitId) where.currentUnitId = q.unitId;
    if (q.interestedParty) where.interestedParty = { contains: q.interestedParty, mode: 'insensitive' };
    if (q.search) {
      where.OR = [
        { subject: { contains: q.search, mode: 'insensitive' } },
        { number: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.organizationId) {
      where.openedBy = { organizationId: q.organizationId };
    }
    if (q.overdue) {
      where.deadlines = { some: { fulfilledAt: null, dueAt: { lt: new Date() } } };
    }
    const [items, total] = await Promise.all([
      this.prisma.process.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          processType: { select: { name: true, code: true } },
          currentUnit: { select: { name: true, code: true } },
          openedBy: { select: { name: true } },
          deadlines: { where: { fulfilledAt: null }, take: 3 },
        },
      }),
      this.prisma.process.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async inbox(user: AuthUser) {
    if (!user.unitId) return { items: [] as unknown[] };
    const items = await this.prisma.process.findMany({
      where: {
        tenantId: user.tenantId,
        movements: {
          some: {
            toUnitId: user.unitId,
            kind: ProcessMovementKind.TRAMITACAO,
            acknowledgedAt: null,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        processType: { select: { name: true, code: true } },
        movements: {
          where: {
            toUnitId: user.unitId,
            kind: ProcessMovementKind.TRAMITACAO,
            acknowledgedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return { items };
  }

  async dashboard(user: AuthUser) {
    const tenantId = user.tenantId;
    const [byStatus, overdue, inbox] = await Promise.all([
      this.prisma.process.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      this.prisma.process.count({
        where: {
          tenantId,
          deadlines: { some: { fulfilledAt: null, dueAt: { lt: new Date() } } },
        },
      }),
      user.unitId
        ? this.prisma.process.count({
            where: {
              tenantId,
              movements: {
                some: {
                  toUnitId: user.unitId,
                  kind: ProcessMovementKind.TRAMITACAO,
                  acknowledgedAt: null,
                },
              },
            },
          })
        : 0,
    ]);
    return { byStatus, overdue, inboxPending: inbox };
  }

  async getOne(user: AuthUser, id: string) {
    const process = await this.prisma.process.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        processType: true,
        currentUnit: { include: { department: { include: { organization: true } } } },
        openedBy: { select: { id: true, name: true, email: true, organizationId: true } },
        movements: {
          orderBy: { createdAt: 'asc' },
          include: {
            fromUnit: true,
            toUnit: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
        documents: { orderBy: { sortOrder: 'asc' } },
        signatures: { include: { user: { select: { name: true } }, processDocument: true } },
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
        deadlines: { orderBy: { dueAt: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true } } } },
      },
    });
    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.assertProcessAccess(process, user);
    return process;
  }

  async tramitar(user: AuthUser, processId: string, toUnitId: string, summary?: string) {
    const process = await this.getOne(user, processId);
    if (process.archivedAt) throw new BadRequestException('Processo arquivado.');
    if (!process.currentUnitId) throw new BadRequestException('Sem unidade atual.');
    if (process.status === ProcessStatus.AGUARDANDO_RECEBIMENTO) {
      throw new BadRequestException(
        'Processo aguardando ciência na unidade de destino. Conclua o recebimento antes de nova tramitação.',
      );
    }
    if (process.currentUnitId !== user.unitId && user.role !== SystemRole.ADMIN) {
      throw new ForbiddenException('Tramitação apenas da unidade atual.');
    }
    const target = await this.prisma.unit.findFirst({
      where: { id: toUnitId, department: { organization: { tenantId: user.tenantId } } },
    });
    if (!target) throw new NotFoundException('Unidade destino inválida');
    await this.prisma.$transaction([
      this.prisma.processMovement.create({
        data: {
          processId,
          fromUnitId: process.currentUnitId,
          toUnitId,
          kind: ProcessMovementKind.TRAMITACAO,
          summary: summary ?? 'Tramitação',
          createdById: user.userId,
        },
      }),
      this.prisma.process.update({
        where: { id: processId },
        data: {
          currentUnitId: toUnitId,
          status: ProcessStatus.AGUARDANDO_RECEBIMENTO,
        },
      }),
    ]);
    const usersTarget = await this.prisma.user.findMany({
      where: { unitId: toUnitId },
      select: { id: true },
    });
    for (const u of usersTarget) {
      await this.notifyUser({
        tenantId: user.tenantId,
        userId: u.id,
        title: 'Processo na caixa de entrada',
        body: `Processo ${process.number}/${process.year} aguarda recebimento.`,
        link: `/processos/${processId}`,
      });
    }
    await this.auditProcess(processId, user.userId, 'TRAMITACAO', { toUnitId });
    return this.getOne(user, processId);
  }

  async despacho(
    user: AuthUser,
    processId: string,
    dispatchText: string,
    forwardToUnitId?: string,
  ) {
    const process = await this.getOne(user, processId);
    if (process.archivedAt) throw new BadRequestException('Processo arquivado.');
    await this.prisma.processMovement.create({
      data: {
        processId,
        fromUnitId: process.currentUnitId,
        toUnitId: process.currentUnitId,
        kind: ProcessMovementKind.DESPACHO,
        dispatchText,
        summary: 'Despacho registrado',
        createdById: user.userId,
        acknowledgedAt: new Date(),
      },
    });
    if (forwardToUnitId) {
      await this.tramitar(user, processId, forwardToUnitId, 'Encaminhamento após despacho');
    }
    await this.auditProcess(processId, user.userId, 'DESPACHO', { forwardToUnitId });
    return this.getOne(user, processId);
  }

  async ciencia(user: AuthUser, processId: string) {
    if (!user.unitId) throw new BadRequestException('Sem setor.');
    const process = await this.getOne(user, processId);
    const pending = await this.prisma.processMovement.findFirst({
      where: {
        processId,
        toUnitId: user.unitId,
        kind: ProcessMovementKind.TRAMITACAO,
        acknowledgedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) throw new BadRequestException('Não há tramitação pendente de recebimento para sua unidade.');
    await this.prisma.$transaction([
      this.prisma.processMovement.update({
        where: { id: pending.id },
        data: { acknowledgedAt: new Date() },
      }),
      this.prisma.processMovement.create({
        data: {
          processId,
          fromUnitId: pending.fromUnitId,
          toUnitId: user.unitId,
          kind: ProcessMovementKind.CIENCIA,
          summary: 'Ciência do recebimento',
          createdById: user.userId,
          acknowledgedAt: new Date(),
        },
      }),
      this.prisma.process.update({
        where: { id: processId },
        data: { status: ProcessStatus.EM_TRAMITACAO },
      }),
    ]);
    await this.auditProcess(processId, user.userId, 'CIENCIA', {});
    return this.getOne(user, processId);
  }

  async devolverComplementacao(user: AuthUser, processId: string, note: string, targetUnitId?: string) {
    const process = await this.getOne(user, processId);
    const toId = targetUnitId ?? process.movements.find((m) => m.kind === ProcessMovementKind.ABERTURA)?.toUnitId;
    if (!toId) throw new BadRequestException('Defina unidade de retorno.');
    await this.prisma.$transaction([
      this.prisma.processMovement.create({
        data: {
          processId,
          fromUnitId: process.currentUnitId,
          toUnitId: toId,
          kind: ProcessMovementKind.DEVOLUCAO_COMPLEMENTACAO,
          summary: note,
          createdById: user.userId,
        },
      }),
      this.prisma.process.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.DEVOLVIDO_COMPLEMENTACAO,
          supplementNote: note,
          currentUnitId: toId,
        },
      }),
    ]);
    await this.auditProcess(processId, user.userId, 'DEVOLUCAO_COMPLEMENTACAO', { targetUnitId: toId });
    return this.getOne(user, processId);
  }

  async solicitarAssinatura(
    user: AuthUser,
    processId: string,
    signerUserIds: string[],
    processDocumentId?: string,
  ) {
    const process = await this.getOne(user, processId);
    const signers = await this.prisma.user.findMany({
      where: { id: { in: signerUserIds }, tenantId: user.tenantId },
    });
    const byId = new Map(signers.map((u) => [u.id, u]));
    for (const uid of signerUserIds) {
      const signer = byId.get(uid);
      if (!signer) throw new BadRequestException(`Signatário inválido ou fora do tenant: ${uid}`);
      const method =
        signer.signaturePolicy === UserSignaturePolicy.ICP_A1
          ? ProcessSignatureMethod.ICP_BRASIL
          : ProcessSignatureMethod.SIMPLES;
      await this.prisma.processSignature.create({
        data: {
          processId,
          processDocumentId: processDocumentId ?? null,
          userId: uid,
          status: ProcessSignatureStatus.PENDENTE,
          method,
        },
      });
      await this.notifyUser({
        tenantId: user.tenantId,
        userId: uid,
        title: 'Assinatura solicitada',
        body: `Processo ${process.number}/${process.year}`,
        link: `/processos/${processId}`,
      });
    }
    await this.prisma.processMovement.create({
      data: {
        processId,
        fromUnitId: process.currentUnitId,
        toUnitId: process.currentUnitId,
        kind: ProcessMovementKind.SOLICITACAO_ASSINATURA,
        summary: `Solicitação para ${signerUserIds.length} signatário(s)`,
        createdById: user.userId,
        acknowledgedAt: new Date(),
      },
    });
    await this.prisma.process.update({
      where: { id: processId },
      data: { status: ProcessStatus.AGUARDANDO_ASSINATURA },
    });
    await this.auditProcess(processId, user.userId, 'SOLICITACAO_ASSINATURA', { signerUserIds });
    return this.getOne(user, processId);
  }

  async assinarSimples(user: AuthUser, signatureId: string) {
    const sig = await this.prisma.processSignature.findFirst({
      where: { id: signatureId, userId: user.userId, status: ProcessSignatureStatus.PENDENTE },
      include: { process: true },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada.');
    if (sig.method === ProcessSignatureMethod.ICP_BRASIL) {
      throw new BadRequestException(
        'Este signatário deve assinar com certificado A1 (ICP-Brasil). Use o endpoint de assinatura A1.',
      );
    }
    const payload = {
      v: 1,
      algorithm: 'SHA-256',
      signedAt: new Date().toISOString(),
      userId: user.userId,
      processId: sig.processId,
      documentId: sig.processDocumentId,
      icpBrasilPrepared: true,
      note: 'Estrutura preparada para ICP-Brasil: substituir por PKCS#7 e carimbo do tempo.',
    };
    const proofHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    await this.prisma.$transaction([
      this.prisma.processSignature.update({
        where: { id: signatureId },
        data: {
          status: ProcessSignatureStatus.ASSINADO,
          signedAt: new Date(),
          proof: { ...payload, proofHash } as Prisma.InputJsonValue,
          method: ProcessSignatureMethod.SIMPLES,
        },
      }),
      this.prisma.processMovement.create({
        data: {
          processId: sig.processId,
          fromUnitId: sig.process.currentUnitId,
          toUnitId: sig.process.currentUnitId,
          kind: ProcessMovementKind.ASSINATURA_REGISTRADA,
          summary: 'Assinatura eletrônica simples registrada',
          createdById: user.userId,
          acknowledgedAt: new Date(),
          metadata: { signatureId, proofHash } as Prisma.InputJsonValue,
        },
      }),
    ]);
    await this.auditProcess(sig.processId, user.userId, 'ASSINATURA_SIMPLES', { signatureId, proofHash });
    const pending = await this.prisma.processSignature.count({
      where: { processId: sig.processId, status: ProcessSignatureStatus.PENDENTE },
    });
    if (pending === 0) {
      await this.prisma.process.update({
        where: { id: sig.processId },
        data: { status: ProcessStatus.EM_TRAMITACAO },
      });
    }
    return this.getOne(user, sig.processId);
  }

  async assinarComCertificadoA1(
    user: AuthUser,
    signatureId: string,
    dto: { certificatePem: string; signatureBase64: string },
  ) {
    const sig = await this.prisma.processSignature.findFirst({
      where: { id: signatureId, userId: user.userId, status: ProcessSignatureStatus.PENDENTE },
      include: { process: true },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada.');
    if (sig.method !== ProcessSignatureMethod.ICP_BRASIL) {
      throw new BadRequestException('Esta assinatura é do tipo simples. Use o fluxo de assinatura eletrônica simples.');
    }
    let docSha = '';
    if (sig.processDocumentId) {
      const doc = await this.prisma.processDocument.findUnique({
        where: { id: sig.processDocumentId },
      });
      docSha = doc?.sha256 ?? '';
    }
    const payloadUtf8 = buildA1SignaturePayload({
      processId: sig.processId,
      signatureId,
      documentSha256: docSha,
    });
    const certMeta = verifyA1DetachedSignature({
      certificatePem: dto.certificatePem,
      payloadUtf8,
      signatureBase64: dto.signatureBase64,
    });
    const proof = {
      v: 1,
      kind: 'ICP_A1_DETACHED',
      payloadUtf8,
      certificateSubject: certMeta.subject,
      certificateIssuer: certMeta.issuer,
      certificateSerial: certMeta.serialNumber,
      certificateFingerprint256: certMeta.fingerprint256,
      certificateValidTo: certMeta.validTo,
      signedAt: new Date().toISOString(),
    };
    await this.prisma.$transaction([
      this.prisma.processSignature.update({
        where: { id: signatureId },
        data: {
          status: ProcessSignatureStatus.ASSINADO,
          signedAt: new Date(),
          method: ProcessSignatureMethod.ICP_BRASIL,
          icpCertificateRef: certMeta.fingerprint256,
          proof: proof as Prisma.InputJsonValue,
        },
      }),
      this.prisma.processMovement.create({
        data: {
          processId: sig.processId,
          fromUnitId: sig.process.currentUnitId,
          toUnitId: sig.process.currentUnitId,
          kind: ProcessMovementKind.ASSINATURA_REGISTRADA,
          summary: 'Assinatura com certificado A1 (ICP-Brasil) registrada',
          createdById: user.userId,
          acknowledgedAt: new Date(),
          metadata: { signatureId, fingerprint256: certMeta.fingerprint256 } as Prisma.InputJsonValue,
        },
      }),
    ]);
    await this.auditProcess(sig.processId, user.userId, 'ASSINATURA_A1', { signatureId });
    const pending = await this.prisma.processSignature.count({
      where: { processId: sig.processId, status: ProcessSignatureStatus.PENDENTE },
    });
    if (pending === 0) {
      await this.prisma.process.update({
        where: { id: sig.processId },
        data: { status: ProcessStatus.EM_TRAMITACAO },
      });
    }
    return this.getOne(user, sig.processId);
  }

  /** Placeholder ICP-Brasil: grava intenção e referência futura sem cadeia real */
  async registrarAssinaturaIcpPendente(user: AuthUser, signatureId: string, certificateRef: string) {
    const sig = await this.prisma.processSignature.findFirst({
      where: { id: signatureId, userId: user.userId },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada.');
    await this.prisma.processSignature.update({
      where: { id: signatureId },
      data: {
        method: ProcessSignatureMethod.ICP_BRASIL,
        icpCertificateRef: certificateRef,
        proof: {
          status: 'aguardando_integracao_icp',
          certificateRef,
          message: 'Integração ICP-Brasil: conectar provedor (BirdID, VALID, etc.)',
        } as Prisma.InputJsonValue,
      },
    });
    await this.auditProcess(sig.processId, user.userId, 'ICP_BRASIL_PREPARACAO', { signatureId });
    return this.getOne(user, sig.processId);
  }

  async anexarDocumento(user: AuthUser, processId: string, file: Express.Multer.File, title: string) {
    const process = await this.getOne(user, processId);
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const uploaded = await this.paperless.uploadDocument(file);
    const paperlessId = String(uploaded?.id ?? '');
    if (!paperlessId) throw new BadRequestException('Upload Paperless não retornou id.');
    const doc = await this.prisma.processDocument.create({
      data: {
        processId,
        title,
        paperlessDocumentId: paperlessId,
        sha256,
        fileName: file.originalname,
        mimeType: file.mimetype,
        bytes: file.size,
        createdById: user.userId,
      },
    });
    await this.prisma.processMovement.create({
      data: {
        processId,
        fromUnitId: process.currentUnitId,
        toUnitId: process.currentUnitId,
        kind: ProcessMovementKind.ANEXO,
        summary: `Anexo: ${title}`,
        createdById: user.userId,
        acknowledgedAt: new Date(),
        metadata: { documentId: doc.id, sha256 } as Prisma.InputJsonValue,
      },
    });
    await this.auditProcess(processId, user.userId, 'ANEXO', { documentId: doc.id, sha256 });
    return doc;
  }

  async comentar(user: AuthUser, processId: string, body: string) {
    await this.getOne(user, processId);
    await this.prisma.processComment.create({
      data: { processId, userId: user.userId, body },
    });
    await this.auditProcess(processId, user.userId, 'COMENTARIO', {});
    return this.getOne(user, processId);
  }

  async prazo(user: AuthUser, processId: string, label: string, dueAt: Date) {
    await this.getOne(user, processId);
    await this.prisma.processDeadline.create({
      data: { processId, label, dueAt },
    });
    await this.auditProcess(processId, user.userId, 'PRAZO', { label, dueAt });
    return this.getOne(user, processId);
  }

  async arquivar(user: AuthUser, processId: string, reason?: string) {
    const process = await this.getOne(user, processId);
    await this.prisma.$transaction([
      this.prisma.processMovement.create({
        data: {
          processId,
          fromUnitId: process.currentUnitId,
          toUnitId: process.currentUnitId,
          kind: ProcessMovementKind.ARQUIVAMENTO,
          summary: reason ?? 'Arquivamento',
          createdById: user.userId,
          acknowledgedAt: new Date(),
        },
      }),
      this.prisma.process.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.ARQUIVADO,
          archivedAt: new Date(),
          archiveReason: reason,
        },
      }),
    ]);
    await this.auditProcess(processId, user.userId, 'ARQUIVAMENTO', { reason });
    return this.getOne(user, processId);
  }

  async desarquivar(user: AuthUser, processId: string) {
    const process = await this.getOne(user, processId);
    if (!process.archivedAt) throw new BadRequestException('Processo não está arquivado.');
    await this.prisma.$transaction([
      this.prisma.processMovement.create({
        data: {
          processId,
          fromUnitId: process.currentUnitId,
          toUnitId: process.currentUnitId,
          kind: ProcessMovementKind.DESARQUIVAMENTO,
          summary: 'Desarquivamento',
          createdById: user.userId,
          acknowledgedAt: new Date(),
        },
      }),
      this.prisma.process.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.EM_TRAMITACAO,
          archivedAt: null,
          archiveReason: null,
        },
      }),
    ]);
    await this.auditProcess(processId, user.userId, 'DESARQUIVAMENTO', {});
    return this.getOne(user, processId);
  }

  async getA1PayloadForSigner(user: AuthUser, processId: string, signatureId: string) {
    await this.getOne(user, processId);
    const sig = await this.prisma.processSignature.findFirst({
      where: {
        id: signatureId,
        processId,
        userId: user.userId,
        status: ProcessSignatureStatus.PENDENTE,
      },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada.');
    if (sig.method !== ProcessSignatureMethod.ICP_BRASIL) {
      throw new BadRequestException('Esta solicitação é de assinatura simples; não há payload A1.');
    }
    let docSha = '';
    if (sig.processDocumentId) {
      const doc = await this.prisma.processDocument.findUnique({
        where: { id: sig.processDocumentId },
      });
      docSha = doc?.sha256 ?? '';
    }
    const payloadUtf8 = buildA1SignaturePayload({
      processId,
      signatureId,
      documentSha256: docSha,
    });
    return {
      payloadUtf8,
      documentSha256: docSha || null,
      hint:
        'Assine exatamente esta string (UTF-8) com a chave privada do certificado A1. Envie o certificado em PEM e a assinatura em Base64 (RSA-SHA256 ou ECDSA com SHA-256, conforme o certificado).',
    };
  }

  async listNotifications(user: AuthUser) {
    return this.prisma.internalNotification.findMany({
      where: { userId: user.userId, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markNotificationRead(user: AuthUser, id: string) {
    const n = await this.prisma.internalNotification.findFirst({
      where: { id, userId: user.userId, tenantId: user.tenantId },
    });
    if (!n) throw new NotFoundException();
    return this.prisma.internalNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
