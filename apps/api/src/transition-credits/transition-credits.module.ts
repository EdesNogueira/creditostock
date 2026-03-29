import { Module } from '@nestjs/common';
import { TransitionCreditsController } from './transition-credits.controller';
import { TransitionCreditsService } from './transition-credits.service';

@Module({
  controllers: [TransitionCreditsController],
  providers: [TransitionCreditsService],
  exports: [TransitionCreditsService],
})
export class TransitionCreditsModule {}
