import { IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CalculateDto } from '../../calculator/dto/calculate.dto';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ example: 'Peça Cliente X', description: 'Name of the quote' })
  name: string;

  @ValidateNested()
  @Type(() => CalculateDto)
  @ApiProperty({ type: CalculateDto, description: 'The print job details for calculation' })
  printJob: CalculateDto;
}
