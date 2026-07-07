import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
}

@Injectable()
export class GoogleOAuthClient {
  constructor(private readonly config: ConfigService) {}

  async getUserByAuthorizationCode(code: string, redirectUri?: string) {
    const token = await this.exchangeCode(code, redirectUri);
    return this.getUserInfo(token.access_token);
  }

  async verifyIdToken(idToken: string) {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', idToken);

    const response = await fetch(url);
    if (!response.ok) {
      throw new UnauthorizedException('Google idToken is invalid');
    }

    const profile = (await response.json()) as GoogleUserProfile;
    const clientId = this.required('GOOGLE_CLIENT_ID');
    if (profile.aud !== clientId) {
      throw new UnauthorizedException('Google idToken audience is invalid');
    }

    return profile;
  }

  private async exchangeCode(code: string, redirectUri?: string) {
    const clientId = this.required('GOOGLE_CLIENT_ID');
    const clientSecret = this.required('GOOGLE_CLIENT_SECRET');
    const resolvedRedirectUri =
      redirectUri ?? this.required('GOOGLE_REDIRECT_URI');

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: resolvedRedirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new UnauthorizedException('Google authorization code is invalid');
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async getUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }

    return (await response.json()) as GoogleUserProfile;
  }

  private required(key: string) {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required`);
    }
    return value;
  }
}
