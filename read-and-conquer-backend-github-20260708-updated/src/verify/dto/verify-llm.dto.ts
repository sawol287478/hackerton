import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyLlmDto {
  @IsInt()
  sessionId: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reviewText?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  review?: string;
}
