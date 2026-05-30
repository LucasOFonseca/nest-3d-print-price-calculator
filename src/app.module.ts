import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigSettingsModule } from './config-settings/config-settings.module';
import { FilamentsModule } from './filaments/filaments.module';
import { PackagingModule } from './packaging/packaging.module';
import { CalculatorModule } from './calculator/calculator.module';
import { QuotesModule } from './quotes/quotes.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    ConfigSettingsModule,
    FilamentsModule,
    PackagingModule,
    CalculatorModule,
    QuotesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
