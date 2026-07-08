import { SessionsController } from './sessions.controller';

describe('SessionsController', () => {
  const requestUser = { userId: 10, role: 'USER' };

  it('5.1 starts a reading session and returns session id/start time', async () => {
    const startTime = new Date('2026-07-07T15:30:00.000Z');
    const sessionsService = {
      start: jest.fn().mockResolvedValue({ sessionId: 31, startTime }),
    };
    const controller = new SessionsController(sessionsService as any);
    const dto = { libraryId: 1, isbn: '9788968481901' };

    await expect(controller.start(requestUser, dto)).resolves.toEqual({
      sessionId: 31,
      startTime,
    });
    expect(sessionsService.start).toHaveBeenCalledWith(10, dto);
  });

  it('5.2 records GPS ping and returns range status', async () => {
    const checkedAt = new Date('2026-07-07T15:40:00.000Z');
    const sessionsService = {
      ping: jest.fn().mockResolvedValue({
        sessionId: 31,
        inRange: true,
        distance: 42,
        status: 'IN_RANGE',
        checkedAt,
      }),
    };
    const controller = new SessionsController(sessionsService as any);
    const dto = { sessionId: 31, latitude: 37.566, longitude: 126.978 };

    await expect(controller.ping(requestUser, dto)).resolves.toEqual({
      sessionId: 31,
      inRange: true,
      distance: 42,
      status: 'IN_RANGE',
      checkedAt,
    });
  });

  it('7 completes reward processing and returns reward summary', async () => {
    const sessionsService = {
      complete: jest.fn().mockResolvedValue({
        exp: 120,
        influence: 25,
        occupiedFaction: 'Blue',
        ranking: 18,
      }),
    };
    const controller = new SessionsController(sessionsService as any);
    const dto = { sessionId: 31, startPage: 15, endPage: 72 };

    await expect(controller.complete(requestUser, dto)).resolves.toEqual({
      exp: 120,
      influence: 25,
      occupiedFaction: 'Blue',
      ranking: 18,
    });
  });
});
