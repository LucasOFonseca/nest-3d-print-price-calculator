import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilamentImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'uuid', description: 'Filament id (ignored on import)' })
  id?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'PLA Branco', description: 'Filament name' })
  name: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({ example: 1000, description: 'Spool total weight in grams' })
  spoolWeight: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 89.9, description: 'Spool purchase price in BRL' })
  spoolPrice: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 0.0899, description: 'Cost per gram (recalculated server-side, ignored on import)' })
  costPerGram?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Created at timestamp (ignored on import)' })
  createdAt?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class PackagingImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'uuid', description: 'Packaging id (ignored on import)' })
  id?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Caixa de Papelão Padrão', description: 'Packaging name' })
  name: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 10, description: 'Quantity of units per package' })
  quantity: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 35.0, description: 'Package purchase price in BRL' })
  packagePrice: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 3.5, description: 'Cost per unit (recalculated server-side, ignored on import)' })
  costPerUnit?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Created at timestamp (ignored on import)' })
  createdAt?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class EnergyImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Singleton id (ignored on import)' })
  id?: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.85, description: 'Price per kWh in BRL' })
  kwhPrice: number;

  @IsNumber()
  @Min(1)
  @ApiProperty({ example: 150, description: 'Printer power consumption in Watts' })
  printerConsumption: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class PrinterImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Singleton id (ignored on import)' })
  id?: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1.5, description: 'Printer wear cost per hour in BRL' })
  wearCostPerHour: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class LaborImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Singleton id (ignored on import)' })
  id?: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 30.0, description: 'Labor hourly rate in BRL' })
  hourlyRate: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class ProfitImportDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Singleton id (ignored on import)' })
  id?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 35, description: 'Default profit margin percentage (0–100)' })
  defaultProfitMargin: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Updated at timestamp (ignored on import)' })
  updatedAt?: string;
}

export class ImportConfigDto {
  @ValidateNested({ each: true })
  @Type(() => FilamentImportDto)
  @ApiProperty({ type: [FilamentImportDto], description: 'List of filaments to import' })
  filaments: FilamentImportDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PackagingImportDto)
  @ApiPropertyOptional({
    type: [PackagingImportDto],
    description: 'Optional list of packaging options to import',
  })
  packaging?: PackagingImportDto[];

  @ValidateNested()
  @Type(() => EnergyImportDto)
  @ApiProperty({ type: EnergyImportDto, description: 'Energy configuration to import' })
  energy: EnergyImportDto;

  @ValidateNested()
  @Type(() => PrinterImportDto)
  @ApiProperty({ type: PrinterImportDto, description: 'Printer configuration to import' })
  printer: PrinterImportDto;

  @ValidateNested()
  @Type(() => LaborImportDto)
  @ApiProperty({ type: LaborImportDto, description: 'Labor configuration to import' })
  labor: LaborImportDto;

  @ValidateNested()
  @Type(() => ProfitImportDto)
  @ApiProperty({ type: ProfitImportDto, description: 'Profit configuration to import' })
  profit: ProfitImportDto;
}
