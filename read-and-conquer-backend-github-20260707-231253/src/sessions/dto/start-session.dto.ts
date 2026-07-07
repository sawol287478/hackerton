import {
  IsInt,
  IsISBN,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class StartSessionDto {
  @IsInt()
  libraryId: number;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsISBN()
  isbn: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  totalPages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  startPage?: number;
}
