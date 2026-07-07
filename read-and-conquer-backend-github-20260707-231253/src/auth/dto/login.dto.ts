import { SocialProvider } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsEnum(SocialProvider)
  provider?: SocialProvider = SocialProvider.GOOGLE;

  @IsOptional()
  @IsString()
  socialId?: string;

  @IsOptional()
  @IsString()
  oauthAccessToken?: string;

  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}
