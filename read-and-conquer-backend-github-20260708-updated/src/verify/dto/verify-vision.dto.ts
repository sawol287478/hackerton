import { IsInt, IsOptional, IsString } from 'class-validator';

export class VerifyVisionDto {
  @IsInt()
  sessionId: number;

  @IsOptional()
  @IsString()
  submittedCoverImageUrl?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
