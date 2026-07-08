import { UsersController } from './users.controller';

describe('UsersController', () => {
  const requestUser = { userId: 10, role: 'USER' };

  it('2.1 registers profile and returns the API spec message', async () => {
    const usersService = { updateProfile: jest.fn().mockResolvedValue({}) };
    const controller = new UsersController(usersService as any);

    await expect(
      controller.updateProfile(requestUser, {
        nickname: 'JungTem',
        factionId: 1,
      }),
    ).resolves.toEqual({ message: '프로필 등록 완료' });
    expect(usersService.updateProfile).toHaveBeenCalledWith(10, {
      nickname: 'JungTem',
      factionId: 1,
    });
  });

  it('2.2 returns my profile without a response wrapper', async () => {
    const usersService = {
      getMe: jest.fn().mockResolvedValue({
        nickname: 'RuntimeUser',
        exp: 120,
        faction: 'Blue',
      }),
    };
    const controller = new UsersController(usersService as any);

    await expect(controller.me(requestUser)).resolves.toEqual({
      nickname: 'RuntimeUser',
      exp: 120,
      faction: 'Blue',
    });
  });
});
