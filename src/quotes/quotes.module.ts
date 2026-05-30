import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { CalculatorModule } from '../calculator/calculator.module';

@Module({
  imports: [CalculatorModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
