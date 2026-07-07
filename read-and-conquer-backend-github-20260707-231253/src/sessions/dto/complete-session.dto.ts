import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CompleteSessionDto {
  @IsInt()
  sessionId: number;

  @IsInt()
  @Min(0)
  startPage: number;

  @IsInt()
  @Min(1)
  endPage: number;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reviewText?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
