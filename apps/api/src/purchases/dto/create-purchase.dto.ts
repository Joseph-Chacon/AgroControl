import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class PurchaseItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number) @Min(0.0001) quantity!: number;
  @Type(() => Number) @Min(0.01) totalCost!: number;
}
export class CreatePurchaseDto {
  @IsUUID() supplierId!: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
