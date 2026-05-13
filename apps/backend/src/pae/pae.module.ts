import { Module } from '@nestjs/common';
import { ProcessesService } from './processes/processes.service';
import { ProcessesController } from './processes/processes.controller';
import { PaeStructureController } from './structure/pae-structure.controller';
import { ProcessTypesController } from './process-types/process-types.controller';
import { DocumentTemplatesController } from './templates/document-templates.controller';
import { PaeFunctionalRolesController } from './functional-roles/pae-functional-roles.controller';
import { MayanModule } from '../mayan/mayan.module';

@Module({
  imports: [MayanModule],
  controllers: [
    ProcessesController,
    PaeStructureController,
    ProcessTypesController,
    DocumentTemplatesController,
    PaeFunctionalRolesController,
  ],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class PaeModule {}
