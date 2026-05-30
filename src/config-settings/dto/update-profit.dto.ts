import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfitDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({ example: 35, description: 'Default profit margin percentage (0–100)' })
  defaultProfitMargin?: number;
}
