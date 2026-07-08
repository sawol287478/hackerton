import { FactionsService } from './factions.service';

describe('FactionsService', () => {
  it('returns faction data from the database instead of hardcoded names/colors', async () => {
    const prisma = {
      faction: {
        findMany: jest.fn().mockResolvedValue([
          {
            factionId: 77,
            factionName: 'DynamicReaders',
            factionColor: '#ABCDEF',
            joinType: 'APPROVAL',
            description: 'runtime faction',
            totalScore: 345,
            _count: { users: 12 },
          },
        ]),
      },
    };
    const service = new FactionsService(prisma as any);

    await expect(service.list()).resolves.toEqual([
      {
        factionId: 77,
        name: 'DynamicReaders',
        color: '#ABCDEF',
        joinType: 'APPROVAL',
        description: 'runtime faction',
        totalScore: 345,
        memberCount: 12,
      },
    ]);
  });

  it('creates a faction from request data and returns the created id', async () => {
    const create = jest.fn().mockResolvedValue({ factionId: 91 });
    const prisma = { faction: { create } };
    const service = new FactionsService(prisma as any);

    await expect(
      service.create({
        name: 'NightOwl',
        color: '#123456',
        joinType: 'FREE',
        description: 'late readers',
      }, 10),
    ).resolves.toEqual({
      factionId: 91,
      message: '진영 생성 완료',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        factionName: 'NightOwl',
        factionColor: '#123456',
        joinType: 'FREE',
        description: 'late readers',
        createdByUserId: 10,
      },
    });
  });
});
