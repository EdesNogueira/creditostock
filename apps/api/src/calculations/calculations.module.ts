import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'calculations' })],
  controllers: [CalculationsController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
