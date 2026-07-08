import { UsersService } from './users.service';

describe('UsersService', () => {
  it('returns my profile from persisted user data, not sample hardcoded values', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 15,
          email: 'runtime@example.com',
          name: 'Runtime Name',
          nickname: 'RuntimeUser',
          exp: 987,
          onboardingCompleted: true,
          faction: {
            factionId: 4,
            factionName: 'SilverFaction',
            factionColor: '#C0C0C0',
          },
          sessions: [],
          ranking: {
            rankPosition: 12,
            totalBooks: 3,
            totalSessions: 5,
          },
        }),
      },
    };
    const service = new UsersService(prisma as any);

    await expect(service.getMe(15)).resolves.toEqual({
      userId: 15,
      email: 'runtime@example.com',
      name: 'Runtime Name',
      nickname: 'RuntimeUser',
      exp: 987,
      onboardingCompleted: true,
      faction: {
        factionId: 4,
        name: 'SilverFaction',
        color: '#C0C0C0',
      },
      ranking: {
        rankPosition: 12,
        totalBooks: 3,
        totalSessions: 5,
      },
    });
  });
});
