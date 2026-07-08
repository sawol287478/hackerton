import { IsInt, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';

export class SubmitSessionDto {
  @IsUrl()
  submittedCoverImageUrl: string;

  @IsInt()
  @Min(0)
  startPage: number;

  @IsInt()
  @Min(1)
  endPage: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reviewText: string;
}
