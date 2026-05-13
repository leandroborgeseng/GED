import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import {
  ConfidentialityLevel,
  ProcessStatus,
  SystemRole,
} from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { ProcessesService } from './processes.service';

class CreateProcessDto {
  @IsString()
  processTypeId!: string;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsOptional()
  @IsString()
  interestedParty?: string;

  @IsOptional()
  @IsEnum(ConfidentialityLevel)
  confidentiality?: ConfidentialityLevel;

  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;

  @IsOptional()
  @IsString()
  unitId?: string;
}

class TramitarDto {
  @IsString()
  toUnitId!: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

class DespachoDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  forwardToUnitId?: string;
}

class DevolverDto {
  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  targetUnitId?: string;
}

class SolicitarAssinaturaDto {
  @IsArray()
  @IsString({ each: true })
  signerUserIds!: string[];

  @IsOptional()
  @IsString()
  processDocumentId?: string;
}

class ArquivarDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class ComentarioDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

class PrazoDto {
  @IsString()
  label!: string;

  @IsDateString()
  dueAt!: string;
}

class AssinarA1Dto {
  @IsString()
  @MinLength(64)
  certificatePem!: string;

  @IsString()
  @MinLength(8)
  signatureBase64!: string;
}

@ApiTags('pae-processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pae/processes')
export class ProcessesController {
  constructor(private readonly processes: ProcessesService) {}

  @Post()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER, SystemRole.USER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProcessDto) {
    return this.processes.create(user, dto);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.processes.dashboard(user);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser) {
    return this.processes.inbox(user);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthUser) {
    return this.processes.listNotifications(user);
  }

  @Patch('notifications/:id/read')
  readNotif(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.processes.markNotificationRead(user, id);
  }

  @Get()
  search(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ProcessStatus,
    @Query('unitId') unitId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('interestedParty') interestedParty?: string,
    @Query('overdue') overdue?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.processes.search(user, {
      status,
      unitId,
      organizationId,
      interestedParty,
      overdue: overdue === '1' || overdue === 'true',
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get(':id/assinaturas/:signatureId/payload-a1')
  payloadA1(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('signatureId') signatureId: string,
  ) {
    return this.processes.getA1PayloadForSigner(user, id, signatureId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.processes.getOne(user, id);
  }

  @Post(':id/tramitar')
  tramitar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TramitarDto) {
    return this.processes.tramitar(user, id, dto.toUnitId, dto.summary);
  }

  @Post(':id/despacho')
  despacho(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DespachoDto) {
    return this.processes.despacho(user, id, dto.text, dto.forwardToUnitId);
  }

  @Post(':id/ciencia')
  ciencia(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.processes.ciencia(user, id);
  }

  @Post(':id/devolver-complementacao')
  devolver(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DevolverDto) {
    return this.processes.devolverComplementacao(user, id, dto.note, dto.targetUnitId);
  }

  @Post(':id/solicitar-assinatura')
  solicitarAssinatura(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SolicitarAssinaturaDto) {
    return this.processes.solicitarAssinatura(user, id, dto.signerUserIds, dto.processDocumentId);
  }

  @Post(':id/assinar/:signatureId')
  assinar(@CurrentUser() user: AuthUser, @Param('id') _id: string, @Param('signatureId') signatureId: string) {
    return this.processes.assinarSimples(user, signatureId);
  }

  @Post(':id/assinar-a1/:signatureId')
  assinarA1(
    @CurrentUser() user: AuthUser,
    @Param('id') _id: string,
    @Param('signatureId') signatureId: string,
    @Body() dto: AssinarA1Dto,
  ) {
    return this.processes.assinarComCertificadoA1(user, signatureId, dto);
  }

  @Post(':id/icp/preparar/:signatureId')
  icpPreparar(
    @CurrentUser() user: AuthUser,
    @Param('id') _id: string,
    @Param('signatureId') signatureId: string,
    @Body() body: { certificateRef: string },
  ) {
    return this.processes.registrarAssinaturaIcpPendente(user, signatureId, body.certificateRef);
  }

  @Post(':id/arquivar')
  arquivar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ArquivarDto) {
    return this.processes.arquivar(user, id, dto.reason);
  }

  @Post(':id/desarquivar')
  desarquivar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.processes.desarquivar(user, id);
  }

  @Post(':id/comentarios')
  comentar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ComentarioDto) {
    return this.processes.comentar(user, id, dto.body);
  }

  @Post(':id/prazos')
  prazo(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PrazoDto) {
    return this.processes.prazo(user, id, dto.label, new Date(dto.dueAt));
  }

  @Post(':id/anexos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  anexo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    return this.processes.anexarDocumento(user, id, file, title || file?.originalname || 'Anexo');
  }
}
