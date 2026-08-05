import { IsEmail, IsString, MinLength } from 'class-validator';
export class BootstrapAdminDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) firstName!: string;
  @IsString() @MinLength(2) lastName!: string;
  @IsString() @MinLength(12) password!: string;
  @IsString() @MinLength(24) setupToken!: string;
}
