import { BaseUnit } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductPresentationDto {
  @IsString() @MinLength(2)
  name!: string;

  @Type(() => Number) @IsNumber() @Min(0.0001)
  contentQuantity!: number;
}

export class CreateProductDto {
  @IsString() @MinLength(2)
  name!: string;

  @IsEnum(BaseUnit)
  baseUnit!: BaseUnit;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minStock?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ProductPresentationDto)
  presentations?: ProductPresentationDto[];
}
