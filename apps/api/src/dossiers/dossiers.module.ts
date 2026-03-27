import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'dossiers' })],
  controllers: [DossiersController],
  providers: [DossiersService],
})
export class DossiersModule {}
