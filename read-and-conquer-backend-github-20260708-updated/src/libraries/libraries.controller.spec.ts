import { LibrariesController } from './libraries.controller';

describe('LibrariesController', () => {
  it('4.1 returns nearby libraries without a response wrapper', async () => {
    const librariesService = {
      findNearby: jest.fn().mockResolvedValue([
        {
          libraryId: 1,
          name: '중앙도서관',
          distance: 320,
          occupiedFaction: 'Blue',
        },
      ]),
    };
    const controller = new LibrariesController(librariesService as any);
    const query = { latitude: 37.5665, longitude: 126.978, radius: 5000 };

    await expect(controller.list(query)).resolves.toEqual([
      {
        libraryId: 1,
        name: '중앙도서관',
        distance: 320,
        occupiedFaction: 'Blue',
      },
    ]);
    expect(librariesService.findNearby).toHaveBeenCalledWith(query);
  });

  it('4.2 returns library detail and influences without a response wrapper', async () => {
    const librariesService = {
      findDetail: jest.fn().mockResolvedValue({
        libraryName: '중앙도서관',
        occupiedFaction: 'Blue',
        influences: [
          { faction: 'Blue', score: 55 },
          { faction: 'Red', score: 30 },
        ],
      }),
    };
    const controller = new LibrariesController(librariesService as any);

    await expect(controller.detail(1)).resolves.toEqual({
      libraryName: '중앙도서관',
      occupiedFaction: 'Blue',
      influences: [
        { faction: 'Blue', score: 55 },
        { faction: 'Red', score: 30 },
      ],
    });
  });
});
