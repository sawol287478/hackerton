import { IsInt, IsString } from 'class-validator';

export class VerifyVisionDto {
  @IsInt()
  sessionId: number;

  @IsString()
  image: string;
}
