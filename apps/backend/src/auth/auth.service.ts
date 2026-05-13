import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type Tokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefresh(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: SystemRole,
    tenantId: string,
    unitId: string | null,
    signaturePolicy: string,
  ): Promise<Tokens> {
    const accessTtl = Number(this.config.get<string>('JWT_ACCESS_SEC', '900')) || 900;
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, tenantId, unitId, signaturePolicy },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessTtl,
      },
    );
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefresh(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.systemRole,
      user.tenantId,
      user.unitId,
      user.signaturePolicy,
    );
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN',
        resource: 'auth',
      },
    });
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.systemRole,
        tenantId: user.tenantId,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        unitId: user.unitId,
        signaturePolicy: user.signaturePolicy,
      },
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashRefresh(refreshToken);
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Refresh inválido');
    await this.prisma.refreshToken.delete({ where: { id: record.id } });
    const tokens = await this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.systemRole,
      record.user.tenantId,
      record.user.unitId,
      record.user.signaturePolicy,
    );
    const u = record.user;
    return {
      ...tokens,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.systemRole,
        tenantId: u.tenantId,
        organizationId: u.organizationId,
        departmentId: u.departmentId,
        unitId: u.unitId,
        signaturePolicy: u.signaturePolicy,
      },
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = this.hashRefresh(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { userId, tokenHash: hash } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetExpires: expires },
      });
      // Em produção: enviar e-mail. Aqui apenas log para desenvolvimento.
      // eslint-disable-next-line no-console
      console.info(`[GED] Reset de senha para ${user.email}: token=${token}`);
    }
    return { message: 'Se o e-mail existir, enviaremos instruções.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: dto.token, resetExpires: { gt: new Date() } },
    });
    if (!user) throw new UnauthorizedException('Token inválido ou expirado');
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetExpires: null },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Senha atualizada.' };
  }
}
