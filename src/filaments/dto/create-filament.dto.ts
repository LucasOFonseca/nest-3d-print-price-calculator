import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFilamentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'PLA Vermelho', description: 'Filament display name' })
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
