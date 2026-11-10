import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export enum UserStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
export class CreateUserDto {
  @IsString()
  name: string;
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6)
  password: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsDateString()
  birthday?: string;
  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;
}
