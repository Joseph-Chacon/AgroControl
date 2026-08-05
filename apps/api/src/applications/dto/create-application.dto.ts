import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
class ApplicationItemDto { @IsUUID() productId!: string; @Type(() => Number) @Min(0.0001) quantity!: number; }
export class CreateApplicationDto {
  @IsUUID() lotId!: string;
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsDateString() appliedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ApplicationItemDto) items!: ApplicationItemDto[];
}
