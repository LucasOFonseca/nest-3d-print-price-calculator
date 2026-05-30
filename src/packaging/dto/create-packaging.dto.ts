import { IsInt, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackagingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Caixa Pequena', description: 'Packaging display name' })
  name: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 10, description: 'Number of units per package' })
  quantity: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 35.00, description: 'Package purchase price in BRL' })
  packagePrice: number;
}
