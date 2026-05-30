import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrinterDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ example: 1.50, description: 'Printer wear cost per hour in BRL' })
  wearCostPerHour?: number;
}
