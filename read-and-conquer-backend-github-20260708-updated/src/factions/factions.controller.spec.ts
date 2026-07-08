import { FactionsController } from './factions.controller';

describe('FactionsController', () => {
  it('3.1 returns faction list without a response wrapper', async () => {
    const factionsService = {
      list: jest.fn().mockResolvedValue([
        {
          factionId: 1,
          name: 'Blue',
          color: '#2196F3',
          joinType: 'FREE',
          description: 'readers',
          totalScore: 10,
          memberCount: 3,
        },
      ]),
    };
    const controller = new FactionsController(factionsService as any);

    await expect(controller.list()).resolves.toEqual([
      {
        factionId: 1,
        name: 'Blue',
        color: '#2196F3',
        joinType: 'FREE',
        description: 'readers',
        totalScore: 10,
        memberCount: 3,
      },
    ]);
  });

  it('3.2 creates a faction and returns id plus message', async () => {
    const factionsService = {
      create: jest.fn().mockResolvedValue({
        factionId: 3,
        message: '진영 생성 완료',
      }),
    };
    const controller = new FactionsController(factionsService as any);
    const dto = {
      name: 'BlueDragon',
      color: '#2196F3',
      joinType: 'FREE',
      description: '독서를 사랑하는 진영',
    };

    await expect(
      controller.create({ userId: 10, role: 'USER' }, dto),
    ).resolves.toEqual({
      factionId: 3,
      message: '진영 생성 완료',
    });
    expect(factionsService.create).toHaveBeenCalledWith(dto, 10);
  });
});
