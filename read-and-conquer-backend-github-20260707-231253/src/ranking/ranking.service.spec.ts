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
            faction: { factionName: 'RankFaction' },
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
        faction: 'RankFaction',
        exp: 4321,
      },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('returns faction rankings from faction and territory aggregates', async () => {
    const prisma = {
      faction: {
        findMany: jest.fn().mockResolvedValue([
          {
            factionId: 9,
            factionName: 'DynamicFaction',
            factionColor: '#FEDCBA',
            totalScore: 777,
            territories: [{ territoryId: 1 }, { territoryId: 2 }],
          },
        ]),
      },
      libraryTerritory: {
        count: jest.fn().mockResolvedValue(4),
      },
    };
    const service = new RankingService(prisma as any);

    await expect(service.getFactionRankings()).resolves.toEqual([
      {
        rank: 1,
        factionId: 9,
        faction: 'DynamicFaction',
        color: '#FEDCBA',
        totalScore: 777,
        occupiedLibraryCount: 2,
        captureRate: 50,
      },
    ]);
  });
});
