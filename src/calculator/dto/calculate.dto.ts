import { IsUUID, IsNumber, Min, IsInt, Max, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateDto {
  @IsUUID()
  @ApiProperty({ example: '3514de13-cfde-4277-bf39-444458514107', description: 'UUID of the filament' })
  filamentId: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 250, description: 'Material used in grams' })
  materialUsed: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 12, description: 'Print time hours' })
  printTimeHours: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @ApiProperty({ example: 30, description: 'Print time minutes' })
  printTimeMinutes: number;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Whether to include post-processing labor cost' })
  includePostProcessing: boolean;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 1, description: 'Paint time hours' })
  paintTimeHours: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @ApiProperty({ example: 0, description: 'Paint time minutes' })
  paintTimeMinutes: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, description: 'Assembly time hours' })
  assemblyTimeHours: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @ApiProperty({ example: 30, description: 'Assembly time minutes' })
  assemblyTimeMinutes: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, description: 'Finishing time hours' })
  finishingTimeHours: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @ApiProperty({ example: 45, description: 'Finishing time minutes' })
  finishingTimeMinutes: number;

  @IsBoolean()
  @ApiProperty({ example: true, description: 'Whether to use default profit margin' })
  useDefaultMargin: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 35, description: 'Custom profit margin percentage' })
  profitMargin: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ example: '857bb7e2-4db1-4e45-8bc6-6c84c68b753a', description: 'UUID of the packaging' })
  packagingId?: string;

  @IsBoolean()
  @ApiProperty({ example: false, description: 'Whether to include packaging' })
  includePackaging: boolean;
}
