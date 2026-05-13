import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class OrgDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}

class DeptDto {
  @IsString()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsString()
  code!: string;
}

class UnitDto {
  @IsString()
  departmentId!: string;

  @IsString()
  name!: string;

  @IsString()
  code!: string;
}

@ApiTags('pae-estrutura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pae/structure')
export class PaeStructureController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tree')
  tree(@CurrentUser() user: AuthUser) {
    return this.prisma.organization.findMany({
      where: { tenantId: user.tenantId, active: true },
      include: {
        departments: {
          where: { active: true },
          include: { units: { where: { active: true } } },
        },
      },
    });
  }

  @Get('organizations')
  orgs(@CurrentUser() user: AuthUser) {
    return this.prisma.organization.findMany({ where: { tenantId: user.tenantId } });
  }

  @Post('organizations')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  createOrg(@CurrentUser() user: AuthUser, @Body() dto: OrgDto) {
    return this.prisma.organization.create({
      data: { tenantId: user.tenantId, name: dto.name, code: dto.code },
    });
  }

  @Get('departments')
  depts(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId, organization: { tenantId: user.tenantId } },
    });
  }

  @Post('departments')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  createDept(@CurrentUser() user: AuthUser, @Body() dto: DeptDto) {
    return this.prisma.department.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  @Get('units')
  units(@CurrentUser() user: AuthUser, @Query('departmentId') departmentId: string) {
    return this.prisma.unit.findMany({
      where: { departmentId, department: { organization: { tenantId: user.tenantId } } },
    });
  }

  @Post('units')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  createUnit(@CurrentUser() user: AuthUser, @Body() dto: UnitDto) {
    return this.prisma.unit.create({
      data: { departmentId: dto.departmentId, name: dto.name, code: dto.code },
    });
  }
}
