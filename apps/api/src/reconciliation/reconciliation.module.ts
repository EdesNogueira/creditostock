import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'matching' })],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
