import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('1.1 returns Google login tokens without a response wrapper', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: true,
      }),
    };
    const controller = new AuthController(authService as any);

    await expect(
      controller.login({ idToken: 'google-id-token' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isNewUser: true,
    });
    expect(authService.login).toHaveBeenCalledWith({
      idToken: 'google-id-token',
    });
  });
});
