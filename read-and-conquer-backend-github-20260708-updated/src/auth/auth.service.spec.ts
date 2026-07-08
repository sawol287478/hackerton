import { SocialProvider } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('creates or finds a user from the verified Google id token profile', async () => {
    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue({
          userId: 101,
          role: 'USER',
          nickname: null,
          factionId: null,
          onboardingCompleted: false,
        }),
      },
    };
    const jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('runtime-access-token')
        .mockResolvedValueOnce('runtime-refresh-token'),
    };
    const googleOAuth = {
      verifyIdToken: jest.fn().mockResolvedValue({
        sub: 'google-sub-runtime',
        email: 'runtime@example.com',
      }),
    };
    const service = new AuthService(
      prisma as any,
      jwt as any,
      googleOAuth as any,
      {} as any,
    );

    await expect(service.login({ idToken: 'runtime-id-token' })).resolves.toEqual(
      {
        accessToken: 'runtime-access-token',
        refreshToken: 'runtime-refresh-token',
        isNewUser: true,
        onboardingCompleted: false,
      },
    );
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          socialProvider_socialId: {
            socialProvider: SocialProvider.GOOGLE,
            socialId: 'google-sub-runtime',
          },
        },
      }),
    );
  });
});
