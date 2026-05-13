import { ConflictException, Injectable } from '@nestjs/common';
import { SystemRole, UserSignaturePolicy } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        organizationId: true,
        departmentId: true,
        unitId: true,
        roleId: true,
        signaturePolicy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    dto: {
      email: string;
      password: string;
      name: string;
      systemRole: SystemRole;
      organizationId?: string;
      departmentId?: string;
      unitId?: string;
      roleId?: string;
      signaturePolicy?: UserSignaturePolicy;
    },
  ) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        systemRole: dto.systemRole,
        tenantId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        unitId: dto.unitId,
        roleId: dto.roleId,
        signaturePolicy: dto.signaturePolicy ?? UserSignaturePolicy.SIMPLES,
      },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        organizationId: true,
        departmentId: true,
        unitId: true,
        roleId: true,
        signaturePolicy: true,
      },
    });
  }
}
