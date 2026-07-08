import { RankingController } from './ranking.controller';

describe('RankingController', () => {
  it('8.1 returns user Top50 ranking without a response wrapper', async () => {
    const rankingService = {
      getUserRankings: jest.fn().mockResolvedValue([
        {
          rank: 1,
          userId: 1,
          nickname: 'JungTem',
          faction: 'Blue',
          exp: 120,
        },
      ]),
    };
    const controller = new RankingController(rankingService as any);

    await expect(controller.users({})).resolves.toEqual([
      {
        rank: 1,
        userId: 1,
        nickname: 'JungTem',
        faction: 'Blue',
        exp: 120,
      },
    ]);
    expect(rankingService.getUserRankings).toHaveBeenCalledWith(50);
  });

  it('8.2 returns faction ranking without a response wrapper', async () => {
    const rankingService = {
      getFactionRankings: jest.fn().mockResolvedValue([
        {
          rank: 1,
          factionId: 1,
          faction: 'Blue',
          color: '#2196F3',
          totalScore: 1200,
          occupiedLibraryCount: 8,
          captureRate: 42.1,
        },
      ]),
    };
    const controller = new RankingController(rankingService as any);

    await expect(controller.factions()).resolves.toEqual([
      {
        rank: 1,
        factionId: 1,
        faction: 'Blue',
        color: '#2196F3',
        totalScore: 1200,
        occupiedLibraryCount: 8,
        captureRate: 42.1,
      },
    ]);
  });
});
