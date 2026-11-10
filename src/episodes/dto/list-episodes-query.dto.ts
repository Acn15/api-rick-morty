import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
function resolveSearch(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
function isNumericSearch(search: string): boolean {
  return /^\d+$/.test(search);
}
export class ListEpisodesQueryDto {
  @IsOptional()
  @Transform(
    ({ value, obj }: { value: unknown; obj: Record<string, unknown> }) => {
      const search = resolveSearch(obj.search);
      if (search !== undefined && isNumericSearch(search)) {
        return undefined;
      }
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      return Number(value);
    },
  )
  @IsInt()
  @Min(1)
  page?: number;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => resolveSearch(value))
  @IsString()
  @MinLength(1)
  search?: string;
}
