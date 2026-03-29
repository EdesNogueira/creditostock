import { Module } from '@nestjs/common';
import { TaxTransitionController } from './tax-transition.controller';
import { TaxTransitionService } from './tax-transition.service';

@Module({
  controllers: [TaxTransitionController],
  providers: [TaxTransitionService],
  exports: [TaxTransitionService],
})
export class TaxTransitionModule {}
