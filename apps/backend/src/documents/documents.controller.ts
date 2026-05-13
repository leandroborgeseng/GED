import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '@prisma/client';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.MANAGER, SystemRole.USER, SystemRole.VIEWER)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string; userId: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documents.list(user.tenantId, user.userId, Number(page) || 1, Number(pageSize) || 25);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string; userId: string }, @Param('id', ParseIntPipe) id: number) {
    return this.documents.get(user.tenantId, user.userId, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: { tenantId: string; userId: string },
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const file = await this.documents.download(user.tenantId, user.userId, id);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    res.send(file.buffer);
  }

  @Post('upload')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER, SystemRole.USER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: { tenantId: string; userId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(user.tenantId, user.userId, file);
  }

  @Get(':id/ocr')
  ocr(@CurrentUser() user: { tenantId: string; userId: string }, @Param('id', ParseIntPipe) id: number) {
    return this.documents.ocrStatus(user.tenantId, user.userId, id);
  }

  @Get(':id/workflows')
  workflows(@CurrentUser() user: { tenantId: string; userId: string }, @Param('id', ParseIntPipe) id: number) {
    return this.documents.workflows(user.tenantId, user.userId, id);
  }
}
