import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
export enum CharacterStatusFilter {
  Alive = 'alive',
  Dead = 'dead',
  Unknown = 'unknown',
}
export enum CharacterGenderFilter {
  Female = 'female',
  Male = 'male',
  Genderless = 'genderless',
  Unknown = 'unknown',
}
function resolveOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
function resolveOptionalEnum(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '' ? undefined : normalized;
}
export class ListCharactersQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return Number(value);
  })
  @IsInt()
  @Min(1)
  page?: number;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveOptionalText(value))
  @IsString()
  @MinLength(1)
  name?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveOptionalEnum(value))
  @IsEnum(CharacterStatusFilter)
  status?: CharacterStatusFilter;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveOptionalText(value))
  @IsString()
  @MinLength(1)
  species?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveOptionalText(value))
  @IsString()
  @MinLength(1)
  type?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveOptionalEnum(value))
  @IsEnum(CharacterGenderFilter)
  gender?: CharacterGenderFilter;
}
