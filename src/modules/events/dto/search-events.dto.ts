import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortBy {
  DATE = 'date',
  TITLE = 'title',
  CREATED_AT = 'created_at',
  TOP = 'top', // 🆕 Top event (banyak peserta)
  NEWEST = 'newest', // 🆕 Event terbaru
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchEventsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.DATE;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // 🏷️ Filter kategori
  @IsOptional()
  @IsString()
  category?: string;

  // 📍 Filter wilayah / region
  @IsOptional()
  @IsString()
  location?: string;

  // 💸 Filter event gratis
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  freeOnly?: boolean;

  // 🎓 Filter event yang punya sertifikat
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hasCertificate?: boolean;
}
