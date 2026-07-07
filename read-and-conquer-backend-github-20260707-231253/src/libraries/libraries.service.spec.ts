import { LibrariesService } from './libraries.service';

describe('LibrariesService', () => {
  it('maps nearby libraries from stored data instead of hardcoded library examples', async () => {
    const prisma = {
      library: {
        findMany: jest.fn().mockResolvedValue([
          {
            libraryId: 44,
            libraryName: 'Runtime Library',
            latitude: 37.5665,
            longitude: 126.978,
            territory: {
              faction: { factionName: 'AmberFaction' },
            },
          },
        ]),
      },
    };
    const service = new LibrariesService(prisma as any, {} as any, {} as any);

    await expect(
      service.findNearby({
        latitude: 37.5665,
        longitude: 126.978,
        radius: 5000,
      }),
    ).resolves.toEqual([
      {
        libraryId: 44,
        name: 'Runtime Library',
        distance: 0,
        occupiedFaction: 'AmberFaction',
      },
    ]);
  });

  it('returns library detail influence names from faction lookup data', async () => {
    const prisma = {
      library: {
        findUnique: jest.fn().mockResolvedValue({
          libraryId: 44,
          libraryName: 'Detail Library',
          territory: { faction: { factionName: 'OwnerFaction' } },
        }),
      },
      territoryLog: {
        groupBy: jest.fn().mockResolvedValue([
          { factionId: 7, _sum: { scoreDelta: 123 } },
        ]),
      },
      faction: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ factionId: 7, factionName: 'ScoreFaction' }]),
      },
    };
    const service = new LibrariesService(prisma as any, {} as any, {} as any);

    await expect(service.findDetail(44)).resolves.toEqual({
      libraryName: 'Detail Library',
      occupiedFaction: 'OwnerFaction',
      influences: [{ faction: 'ScoreFaction', score: 123 }],
    });
  });
});
