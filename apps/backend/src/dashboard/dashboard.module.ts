import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MayanModule } from '../mayan/mayan.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MayanModule, StorageModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
