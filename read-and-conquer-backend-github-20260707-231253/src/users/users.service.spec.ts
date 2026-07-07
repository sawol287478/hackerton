import { UsersService } from './users.service';

describe('UsersService', () => {
  it('returns my profile from persisted user data, not sample hardcoded values', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 15,
          nickname: 'RuntimeUser',
          exp: 987,
          faction: { factionName: 'SilverFaction' },
          sessions: [],
          ranking: null,
        }),
      },
    };
    const service = new UsersService(prisma as any);

    await expect(service.getMe(15)).resolves.toEqual({
      nickname: 'RuntimeUser',
      exp: 987,
      faction: 'SilverFaction',
    });
  });
});
