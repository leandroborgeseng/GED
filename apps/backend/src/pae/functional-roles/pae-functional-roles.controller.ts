import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Prisma, SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class FunRoleDto {
  @IsString()
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  permissions?: Record<string, unknown>;
}

@ApiTags('pae-funcoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pae/roles')
export class PaeFunctionalRolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.role.findMany({ where: { tenantId: user.tenantId } });
  }

  @Post()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: FunRoleDto) {
    return this.prisma.role.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        permissions: dto.permissions as Prisma.InputJsonValue,
      },
    });
  }
}
