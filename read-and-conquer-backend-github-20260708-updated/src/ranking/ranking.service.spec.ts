import { RankingService } from './ranking.service';

describe('RankingService', () => {
  it('returns user rankings from user rows with Top50 default handled by controller/service caller', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 3,
            nickname: 'RankedRuntimeUser',
            exp: 4321,
            faction: {
              factionId: 6,
              factionName: 'RankFaction',
              factionColor: '#654321',
            },
            sessions: [{ bookId: 10 }, { bookId: 10 }, { bookId: 11 }],
          },
        ]),
      },
    };
    const service = new RankingService(prisma as any);

    await expect(service.getUserRankings(50)).resolves.toEqual([
      {
        rank: 1,
        userId: 3,
        nickname: 'RankedRuntimeUser',
        faction: {
          factionId: 6,
          name: 'RankFaction',
          color: '#654321',
        },
        totalExp: 4321,
        totalBooks: 2,
      },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('returns faction rankings from influence and occupied-library aggregates', async () => {
    const prisma = {
      faction: {
        findMany: jest.fn().mockResolvedValue([
          {
            factionId: 9,
            factionName: 'DynamicFaction',
            factionColor: '#FEDCBA',
            _count: { createdLibraries: 2 },
            influences: [{ influenceScore: 300 }, { influenceScore: 477 }],
          },
        ]),
      },
    };
    const service = new RankingService(prisma as any);

    await expect(service.getFactionRankings()).resolves.toEqual([
      {
        rank: 1,
        factionId: 9,
        name: 'DynamicFaction',
        color: '#FEDCBA',
        totalInfluence: 777,
        occupiedLibraryCount: 2,
      },
    ]);
  });
});
