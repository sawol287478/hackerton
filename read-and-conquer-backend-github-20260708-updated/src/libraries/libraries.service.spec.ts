import { LibrariesService } from './libraries.service';

describe('LibrariesService', () => {
  it('maps nearby libraries from stored data instead of hardcoded library examples', async () => {
    const prisma = {
      library: {
        findMany: jest.fn().mockResolvedValue([
          {
            libraryId: 44,
            libraryName: 'Runtime Library',
            address: 'Runtime Address',
            latitude: 37.5665,
            longitude: 126.978,
            currentOccupiedFaction: {
              factionId: 8,
              factionName: 'AmberFaction',
              factionColor: '#ABCDEF',
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
        address: 'Runtime Address',
        latitude: 37.5665,
        longitude: 126.978,
        distance: 0,
        occupiedFaction: {
          factionId: 8,
          name: 'AmberFaction',
          color: '#ABCDEF',
        },
      },
    ]);
  });

  it('returns library detail influence names from faction lookup data', async () => {
    const prisma = {
      library: {
        findUnique: jest.fn().mockResolvedValue({
          libraryId: 44,
          libraryName: 'Detail Library',
          address: 'Detail Address',
          latitude: 37.1,
          longitude: 127.1,
          operatingHours: '09:00-18:00',
          closedDays: '월요일',
          currentOccupiedFaction: {
            factionId: 1,
            factionName: 'OwnerFaction',
            factionColor: '#111111',
          },
          influences: [
            {
              factionId: 7,
              influenceScore: 123,
              faction: {
                factionName: 'ScoreFaction',
                factionColor: '#222222',
              },
            },
          ],
        }),
      },
    };
    const service = new LibrariesService(prisma as any, {} as any, {} as any);

    await expect(service.findDetail(44)).resolves.toEqual({
      libraryId: 44,
      libraryName: 'Detail Library',
      address: 'Detail Address',
      latitude: 37.1,
      longitude: 127.1,
      operatingHours: '09:00-18:00',
      closedDays: '월요일',
      currentOccupiedFaction: {
        factionId: 1,
        name: 'OwnerFaction',
        color: '#111111',
      },
      influences: [
        {
          factionId: 7,
          faction: 'ScoreFaction',
          color: '#222222',
          score: 123,
        },
      ],
      canStartReading: false,
    });
  });
});
