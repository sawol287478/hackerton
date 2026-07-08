import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SocialProvider } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { GoogleOAuthClient } from '../integrations/services/google-oauth.client';
import { KakaoOAuthClient } from '../integrations/services/kakao-oauth.client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleOAuth: GoogleOAuthClient,
    private readonly kakaoOAuth: KakaoOAuthClient,
  ) {}

  async login(dto: LoginDto) {
    const provider = dto.idToken
      ? SocialProvider.GOOGLE
      : (dto.provider ?? SocialProvider.GOOGLE);
    const profile = await this.resolveOAuthProfile(provider, dto);
    const socialId = this.resolveSocialId(provider, profile, dto.socialId);

    if (!socialId) {
      throw new BadRequestException(
        'idToken, socialId, or authorizationCode is required',
      );
    }

    const user = await this.prisma.user.upsert({
      where: {
        socialProvider_socialId: {
          socialProvider: provider,
          socialId,
        },
      },
      update: {
        email: this.resolveProfileField(profile, 'email'),
        name: this.resolveProfileField(profile, 'name'),
        lastLoginAt: new Date(),
      },
      create: {
        socialProvider: provider,
        socialId,
        email: this.resolveProfileField(profile, 'email'),
        name: this.resolveProfileField(profile, 'name'),
        lastLoginAt: new Date(),
      },
      include: { faction: true },
    });

    const tokens = await this.issueTokens(user.userId, user.role);

    return {
      ...tokens,
      isNewUser: !user.nickname || !user.factionId,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: number;
        role: string;
        tokenType?: string;
      }>(refreshToken);

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { userId: payload.userId },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.issueTokens(user.userId, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout() {
    return { message: '로그아웃 완료' };
  }

  private async resolveOAuthProfile(provider: SocialProvider, dto: LoginDto) {
    if (provider === SocialProvider.GOOGLE && dto.idToken) {
      return this.googleOAuth.verifyIdToken(dto.idToken);
    }

    if (!dto.authorizationCode) {
      return null;
    }

    if (provider === SocialProvider.GOOGLE) {
      return this.googleOAuth.getUserByAuthorizationCode(
        dto.authorizationCode,
        dto.redirectUri,
      );
    }

    if (provider === SocialProvider.KAKAO) {
      return this.kakaoOAuth.getUserByAuthorizationCode(
        dto.authorizationCode,
        dto.redirectUri,
      );
    }

    return null;
  }

  private resolveSocialId(
    provider: SocialProvider,
    profile: unknown,
    fallback?: string,
  ) {
    if (
      provider === SocialProvider.GOOGLE &&
      this.isRecord(profile) &&
      'sub' in profile
    ) {
      return String(profile.sub);
    }
    if (
      provider === SocialProvider.KAKAO &&
      this.isRecord(profile) &&
      'id' in profile
    ) {
      return String(profile.id);
    }
    return fallback;
  }

  private resolveProfileField(profile: unknown, key: 'email' | 'name') {
    if (this.isRecord(profile) && key in profile && profile[key]) {
      return String(profile[key]);
    }
    return undefined;
  }

  private async issueTokens(userId: number, role: string) {
    const accessToken = await this.jwtService.signAsync(
      {
        userId,
        role,
        tokenType: 'access',
      },
      { expiresIn: '2h' },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        userId,
        role,
        tokenType: 'refresh',
      },
      { expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
