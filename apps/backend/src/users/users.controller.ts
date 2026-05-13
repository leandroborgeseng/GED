import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole, UserSignaturePolicy } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: SystemRole })
  @IsEnum(SystemRole)
  systemRole!: SystemRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ required: false, enum: UserSignaturePolicy })
  @IsOptional()
  @IsEnum(UserSignaturePolicy)
  signaturePolicy?: UserSignaturePolicy;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  list(@CurrentUser() user: { tenantId: string }) {
    return this.users.listByTenant(user.tenantId);
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateUserDto) {
    return this.users.create(user.tenantId, dto);
  }
}
