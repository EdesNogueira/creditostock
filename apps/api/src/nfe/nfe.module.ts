import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NfeController } from './nfe.controller';
import { NfeService } from './nfe.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'nfe-import' }),
    StorageModule,
  ],
  controllers: [NfeController],
  providers: [NfeService],
  exports: [NfeService],
})
export class NfeModule {}
