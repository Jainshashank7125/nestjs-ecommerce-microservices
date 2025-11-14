import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Human friendly product name',
    example: 'Wireless Mouse',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Optional product description',
    example: 'Ergonomic mouse with Bluetooth support',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Unit price for the product', example: 49.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Units available in stock', example: 120 })
  @IsNumber()
  @Min(0)
  quantity: number;
}

