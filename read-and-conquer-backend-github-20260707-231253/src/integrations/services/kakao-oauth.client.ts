import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

export interface KakaoUserProfile {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

@Injectable()
export class KakaoOAuthClient {
  constructor(private readonly config: ConfigService) {}

  async getUserByAuthorizationCode(code: string, redirectUri?: string) {
    const token = await this.exchangeCode(code, redirectUri);
    return this.getUserInfo(token.access_token);
  }

  private async exchangeCode(code: string, redirectUri?: string) {
    const clientId = this.required('KAKAO_REST_API_KEY');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
    });

    if (redirectUri) {
      body.set('redirect_uri', redirectUri);
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new UnauthorizedException('Kakao authorization code is invalid');
    }

    return (await response.json()) as KakaoTokenResponse;
  }

  private async getUserInfo(accessToken: string) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Kakao user profile');
    }

    return (await response.json()) as KakaoUserProfile;
  }

  private required(key: string) {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required`);
    }
    return value;
  }
}
