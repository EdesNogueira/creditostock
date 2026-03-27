import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'stock-import' }),
    StorageModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
