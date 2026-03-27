import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { BranchesModule } from './branches/branches.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { NfeModule } from './nfe/nfe.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { CalculationsModule } from './calculations/calculations.module';
import { IssuesModule } from './issues/issues.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    CompaniesModule,
    BranchesModule,
    UsersModule,
    ProductsModule,
    StockModule,
    NfeModule,
    ReconciliationModule,
    CalculationsModule,
    IssuesModule,
    DossiersModule,
    AuditModule,
  ],
})
export class AppModule {}
