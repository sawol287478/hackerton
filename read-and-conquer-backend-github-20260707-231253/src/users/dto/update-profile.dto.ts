import { IsInt, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9가-힣_]+$/, {
    message: 'nickname allows Korean, English, numbers, and underscore only',
  })
  nickname: string;

  @IsInt()
  factionId: number;
}
