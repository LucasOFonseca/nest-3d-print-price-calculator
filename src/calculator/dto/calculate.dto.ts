import { IsUUID, IsNumber, Min, IsInt, Max, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilamentItemDto {
  @IsUUID()
  @ApiProperty({ example: '3514de13-cfde-4277-bf39-444458514107', description: 'UUID of the filament' })
  filamentId: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 250, description: 'Material used in grams for this filament' })
  materialUsed: number;
}

export class CalculateDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ example: '3514de13-cfde-4277-bf39-444458514107', description: 'UUID of the filament (single-filament mode)' })
  filamentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ example: 250, description: 'Material used in grams (single-filament mode)' })
  materialUsed?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilamentItemDto)
  @ApiPropertyOptional({
    type: [FilamentItemDto],
    example: [
      { filamentId: '3514de13-cfde-4277-bf39-444458514107', materialUsed: 100 },
      { filamentId: 'a1b2c3d4-0000-0000-0000-000000000000', materialUsed: 50 },
    ],
    description: 'Array of filament specifications for multi-filament prints',
  })
  filaments?: FilamentItemDto[];

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
  @IsArray()
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({ type: [String], example: ['857bb7e2-4db1-4e45-8bc6-6c84c68b753a'], description: 'Array of packaging UUIDs' })
  packagingIds?: string[];

  @IsBoolean()
  @ApiProperty({ example: false, description: 'Whether to include packaging' })
  includePackaging: boolean;
}
