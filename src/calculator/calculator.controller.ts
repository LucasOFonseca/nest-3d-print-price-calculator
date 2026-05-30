import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CalculatorService } from './calculator.service';
import { CalculateDto } from './dto/calculate.dto';

@ApiTags('calculator')
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform a stateless price calculation' })
  @ApiResponse({ status: 200, description: 'Calculation successfully performed' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  async calculate(@Body() dto: CalculateDto) {
    return this.calculatorService.calculate(dto);
  }
}
