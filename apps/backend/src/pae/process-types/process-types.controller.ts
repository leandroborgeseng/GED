import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class ProcessTypeDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('pae-tipos-processo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pae/process-types')
export class ProcessTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.processType.findMany({ where: { tenantId: user.tenantId } });
  }

  @Post()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: ProcessTypeDto) {
    return this.prisma.processType.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });
  }
}
