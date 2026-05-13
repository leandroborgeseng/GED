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

class TemplateDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  variables?: Record<string, unknown>;
}

@ApiTags('pae-modelos-documento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pae/document-templates')
export class DocumentTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.documentTemplate.findMany({ where: { tenantId: user.tenantId } });
  }

  @Post()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: TemplateDto) {
    return this.prisma.documentTemplate.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        code: dto.code,
        body: dto.body,
        variables: dto.variables as Prisma.InputJsonValue,
      },
    });
  }
}
