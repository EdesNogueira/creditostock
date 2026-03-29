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
import { TaxRulesModule } from './tax-rules/tax-rules.module';
import { TaxTransitionModule } from './tax-transition/tax-transition.module';
import { TransitionCreditsModule } from './transition-credits/transition-credits.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const u = new URL(redisUrl);
            return {
              redis: {
                host: u.hostname,
                port: parseInt(u.port) || 6379,
                password: u.password || undefined,
                tls: u.protocol === 'rediss:' ? {} : undefined,
              },
            };
          } catch { /* fall through */ }
        }
        return {
          redis: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          },
        };
      },
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
    TaxRulesModule,
    TaxTransitionModule,
    TransitionCreditsModule,
    SettingsModule,
  ],
})
export class AppModule {}
