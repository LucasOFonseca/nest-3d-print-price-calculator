import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilamentImportDto {
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
  @ApiProperty({ example: 89.90, description: 'Spool purchase price in BRL' })
  spoolPrice: number;
}

export class PackagingImportDto {
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
  @ApiProperty({ example: 35.00, description: 'Package purchase price in BRL' })
  packagePrice: number;
}

export class EnergyImportDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.85, description: 'Price per kWh in BRL' })
  kwhPrice: number;

  @IsNumber()
  @Min(1)
  @ApiProperty({ example: 150, description: 'Printer power consumption in Watts' })
  printerConsumption: number;
}

export class PrinterImportDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1.50, description: 'Printer wear cost per hour in BRL' })
  wearCostPerHour: number;
}

export class LaborImportDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 30.00, description: 'Labor hourly rate in BRL' })
  hourlyRate: number;
}

export class ProfitImportDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 35, description: 'Default profit margin percentage (0–100)' })
  defaultProfitMargin: number;
}

export class ImportConfigDto {
  @ValidateNested({ each: true })
  @Type(() => FilamentImportDto)
  @ApiProperty({ type: [FilamentImportDto], description: 'List of filaments to import' })
  filaments: FilamentImportDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PackagingImportDto)
  @ApiPropertyOptional({ type: [PackagingImportDto], description: 'Optional list of packaging options to import' })
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
