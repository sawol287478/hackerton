import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyLlmDto {
  @IsInt()
  sessionId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  review: string;
}
