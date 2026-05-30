import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEnergyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ example: 0.85, description: 'Price per kWh in BRL' })
  kwhPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ example: 150, description: 'Printer power consumption in Watts' })
  printerConsumption?: number;
}
