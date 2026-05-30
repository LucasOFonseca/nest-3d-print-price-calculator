import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigSettingsModule } from './config-settings/config-settings.module';
import { FilamentsModule } from './filaments/filaments.module';
import { PackagingModule } from './packaging/packaging.module';
import { CalculatorModule } from './calculator/calculator.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    ConfigSettingsModule,
    FilamentsModule,
    PackagingModule,
    CalculatorModule,
    QuotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
