import { InfluenceActionType, ReadingSessionStatus } from '@prisma/client';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  it('captures a library when the user faction becomes the highest influence', async () => {
    const startedAt = new Date(Date.now() - 25 * 60 * 1000);
    const tx = {
      readingSession: {
        findFirst: jest.fn().mockResolvedValue({
          sessionId: 31,
          userId: 10,
          factionId: 2,
          libraryId: 1,
          startTime: startedAt,
          status: ReadingSessionStatus.IN_PROGRESS,
          isLocationValid: true,
          user: { userId: 10, factionId: 2 },
          book: { title: 'Runtime Book', coverImageUrl: null },
          aiVerification: null,
          library: {
            libraryId: 1,
            latitude: 37.5665,
            longitude: 126.978,
            currentOccupiedFactionId: 1,
            currentOccupiedFaction: {
              factionId: 1,
              factionName: 'BlueFaction',
            },
          },
        }),
        update: jest.fn().mockResolvedValue({
          sessionId: 31,
          status: ReadingSessionStatus.VERIFICATION_PASSED,
        }),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ bookId: 1 }]),
      },
      aiVerification: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      libraryInfluence: {
        upsert: jest.fn().mockResolvedValue({
          libraryId: 1,
          factionId: 2,
          influenceScore: 75,
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            factionId: 1,
            influenceScore: 60,
            faction: { factionName: 'BlueFaction' },
          },
          {
            factionId: 2,
            influenceScore: 75,
            faction: { factionName: 'RedFaction' },
          },
        ]),
      },
      library: {
        update: jest.fn().mockResolvedValue({}),
      },
      influenceLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ exp: 120 }),
        count: jest.fn().mockResolvedValue(17),
      },
      faction: {
        update: jest.fn().mockResolvedValue({}),
      },
      userRanking: {
        upsert: jest.fn().mockResolvedValue({ rankPosition: 18 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new SessionsService(
      prisma as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.complete(10, { sessionId: 31, startPage: 15, endPage: 72 }),
    ).resolves.toEqual({
      sessionId: 31,
      status: ReadingSessionStatus.VERIFICATION_PASSED,
      reward: {
        exp: 120,
        influence: 25,
      },
      occupation: {
        previousFaction: 'BlueFaction',
        currentFaction: 'RedFaction',
        changed: true,
      },
      ranking: {
        userRank: 18,
      },
    });
    expect(tx.library.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { libraryId: 1 },
        data: expect.objectContaining({
          currentOccupiedFactionId: 2,
        }),
      }),
    );
    expect(tx.influenceLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          factionId: 2,
          scoreDelta: 25,
          influenceBefore: 50,
          influenceAfter: 75,
          previousOccupiedFactionId: 1,
          newOccupiedFactionId: 2,
          isOccupationChanged: true,
          actionType: InfluenceActionType.OCCUPATION_CHANGED,
        }),
      }),
    );
  });
});
