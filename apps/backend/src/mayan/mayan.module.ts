import { Module } from '@nestjs/common';
import { MayanService } from './mayan.service';

@Module({
  providers: [MayanService],
  exports: [MayanService],
})
export class MayanModule {}
