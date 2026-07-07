import { HttpStatus, Injectable } from '@nestjs/common';
import {
  LocationLogStatus,
  Prisma,
  ReadingSessionStatus,
  TerritoryActionType,
  TerritoryStatus,
} from '@prisma/client';
import {
  CHECK_IN_RADIUS_METERS,
  EXP_REWARD,
  MIN_READING_MINUTES,
  TERRITORY_HP_DELTA,
  TERRITORY_MAX_HP,
} from '../common/constants/game.constants';
import { BusinessCode } from '../common/exceptions/business-code';
import { BusinessException } from '../common/exceptions/business.exception';
import { getDistanceMeters } from '../common/utils/geo';
import { LibraryInfoClient } from '../integrations/services/library-info.client';
import { PrismaService } from '../prisma/prisma.service';
import { AiVerificationService } from './ai-verification.service';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { PingSessionDto } from './dto/ping-session.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiVerification: AiVerificationService,
    private readonly libraryInfo: LibraryInfoClient,
  ) {}

  async start(userId: number, dto: StartSessionDto) {
    const [user, library, activeSession] = await Promise.all([
      this.prisma.user.findUnique({ where: { userId } }),
      this.prisma.library.findUnique({ where: { libraryId: dto.libraryId } }),
      this.prisma.readingSession.findFirst({
        where: { userId, status: ReadingSessionStatus.ACTIVE },
      }),
    ]);

    if (!user) {
      throw new BusinessException(
        BusinessCode.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (!user.factionId) {
      throw new BusinessException(
        BusinessCode.PROFILE_NOT_COMPLETED,
        'Profile must be completed before starting a session',
      );
    }
    if (!library) {
      throw new BusinessException(
        BusinessCode.LIBRARY_NOT_FOUND,
        'Library not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (activeSession) {
      throw new BusinessException(
        BusinessCode.ACTIVE_SESSION_EXISTS,
        'An active reading session already exists',
        HttpStatus.CONFLICT,
      );
    }

    const distanceMeters = this.hasLocation(dto)
      ? this.getDistanceFromLibrary(
          { latitude: dto.latitude, longitude: dto.longitude },
          library,
        )
      : null;
    if (distanceMeters !== null && distanceMeters > CHECK_IN_RADIUS_METERS) {
      throw new BusinessException(
        BusinessCode.OUT_OF_LIBRARY_RADIUS,
        `User is ${Math.round(distanceMeters)}m away from the library`,
      );
    }

    const externalBook = await this.libraryInfo.findBookByIsbn(dto.isbn);
    const bookData = {
      isbn: dto.isbn,
      title: dto.title ?? externalBook?.title,
      author: dto.author ?? externalBook?.author,
      publisher: dto.publisher ?? externalBook?.publisher,
      coverImageUrl: dto.coverImageUrl ?? externalBook?.coverImageUrl,
      totalPages: dto.totalPages ?? externalBook?.totalPages,
    };

    if (!bookData.title) {
      throw new BusinessException(
        BusinessCode.BOOK_NOT_FOUND,
        'Book title is required when Library Info API cannot resolve ISBN',
      );
    }
    const bookTitle = bookData.title;

    const session = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.upsert({
        where: { isbn: dto.isbn },
        update: {
          title: bookTitle,
          author: bookData.author,
          publisher: bookData.publisher,
          coverImageUrl: bookData.coverImageUrl,
          totalPages: bookData.totalPages,
        },
        create: {
          isbn: bookData.isbn,
          title: bookTitle,
          author: bookData.author,
          publisher: bookData.publisher,
          coverImageUrl: bookData.coverImageUrl,
          totalPages: bookData.totalPages,
        },
      });

      const created = await tx.readingSession.create({
        data: {
          userId,
          libraryId: dto.libraryId,
          bookId: book.bookId,
          startPage: dto.startPage,
          status: ReadingSessionStatus.ACTIVE,
        },
        include: { book: true, library: true },
      });

      if (distanceMeters !== null && this.hasLocation(dto)) {
        await tx.locationLog.create({
          data: {
            sessionId: created.sessionId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            distanceFromLibrary: distanceMeters,
            status: LocationLogStatus.IN_RANGE,
          },
        });
      }

      return created;
    });

    return {
      sessionId: session.sessionId,
      startTime: session.startTime,
    };
  }

  async ping(userId: number, dto: PingSessionDto) {
    const session = await this.prisma.readingSession.findFirst({
      where: { sessionId: dto.sessionId, userId },
      include: { library: true },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (session.status !== ReadingSessionStatus.ACTIVE) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_ACTIVE,
        'Session is not active',
      );
    }

    const distanceMeters = this.getDistanceFromLibrary(dto, session.library);
    const status =
      distanceMeters <= CHECK_IN_RADIUS_METERS
        ? LocationLogStatus.IN_RANGE
        : LocationLogStatus.OUT_OF_RANGE;

    const log = await this.prisma.locationLog.create({
      data: {
        sessionId: session.sessionId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        distanceFromLibrary: distanceMeters,
        status,
      },
    });

    return {
      sessionId: session.sessionId,
      inRange: status === LocationLogStatus.IN_RANGE,
      distance: Math.round(distanceMeters),
      status,
      checkedAt: log.checkedAt,
    };
  }

  async complete(userId: number, dto: CompleteSessionDto) {
    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        const session = await tx.readingSession.findFirst({
          where: { sessionId: dto.sessionId, userId },
          include: {
            user: true,
            book: true,
            library: {
              include: { territory: true },
            },
          },
        });

        if (!session) {
          throw new BusinessException(
            BusinessCode.SESSION_NOT_FOUND,
            'Session not found',
            HttpStatus.NOT_FOUND,
          );
        }
        if (session.status !== ReadingSessionStatus.ACTIVE) {
          throw new BusinessException(
            BusinessCode.SESSION_NOT_ACTIVE,
            'Session is not active',
          );
        }
        if (!session.user.factionId) {
          throw new BusinessException(
            BusinessCode.PROFILE_NOT_COMPLETED,
            'Profile must be completed before completing a session',
          );
        }
        if (dto.endPage < dto.startPage) {
          throw new BusinessException(
            BusinessCode.INVALID_PAGE_RANGE,
            'End page must be greater than or equal to start page',
          );
        }

        const durationMinutes = Math.floor(
          (now.getTime() - session.startTime.getTime()) / 60000,
        );
        if (durationMinutes < MIN_READING_MINUTES) {
          throw new BusinessException(
            BusinessCode.MIN_READING_TIME_NOT_MET,
            `Reading session must be at least ${MIN_READING_MINUTES} minutes`,
          );
        }

        if (dto.latitude !== undefined && dto.longitude !== undefined) {
          const distanceMeters = this.getDistanceFromLibrary(
            { latitude: dto.latitude, longitude: dto.longitude },
            session.library,
          );
          await tx.locationLog.create({
            data: {
              sessionId: session.sessionId,
              latitude: dto.latitude,
              longitude: dto.longitude,
              distanceFromLibrary: distanceMeters,
              status:
                distanceMeters <= CHECK_IN_RADIUS_METERS
                  ? LocationLogStatus.IN_RANGE
                  : LocationLogStatus.OUT_OF_RANGE,
            },
          });
        }

        const coverImageUrl = dto.coverImageUrl;
        const reviewText = dto.reviewText;
        const shouldVerifyAi = Boolean(coverImageUrl && reviewText);
        const ai = shouldVerifyAi
          ? await this.aiVerification.verify({
              bookTitle: session.book.title,
              expectedCoverImageUrl: session.book.coverImageUrl,
              submittedCoverImageUrl: coverImageUrl as string,
              reviewText: reviewText as string,
            })
          : {
              visionConfidence: 1,
              llmConfidence: 1,
              isPassed: true,
              failReason: null,
            };

        if (shouldVerifyAi && coverImageUrl && reviewText) {
          await tx.aiVerification.upsert({
            where: { sessionId: session.sessionId },
            update: {
              coverImageUrl,
              reviewText,
              visionConfidence: ai.visionConfidence,
              llmConfidence: ai.llmConfidence,
              isPassed: ai.isPassed,
              failReason: ai.failReason,
              verifiedAt: now,
            },
            create: {
              sessionId: session.sessionId,
              coverImageUrl,
              reviewText,
              visionConfidence: ai.visionConfidence,
              llmConfidence: ai.llmConfidence,
              isPassed: ai.isPassed,
              failReason: ai.failReason,
              verifiedAt: now,
            },
          });
        }

        if (!ai.isPassed) {
          const failedSession = await tx.readingSession.update({
            where: { sessionId: session.sessionId },
            data: {
              endTime: now,
              durationMinutes,
              startPage: dto.startPage,
              endPage: dto.endPage,
              status: ReadingSessionStatus.CANCELED,
            },
          });

          return {
            session: failedSession,
            verification: ai,
            reward: null,
            territory: null,
          };
        }

        const result = this.calculateTerritoryChange(
          session.library.territory,
          session.user.factionId,
        );

        const territory = session.library.territory
          ? await tx.libraryTerritory.update({
              where: { libraryId: session.libraryId },
              data: {
                factionId: result.factionId,
                hp: result.hpAfter,
                status: TerritoryStatus.OCCUPIED,
                occupiedAt:
                  result.actionType === TerritoryActionType.CAPTURE
                    ? now
                    : session.library.territory.occupiedAt,
              },
              include: { faction: true },
            })
          : await tx.libraryTerritory.create({
              data: {
                libraryId: session.libraryId,
                factionId: result.factionId,
                hp: result.hpAfter,
                status: TerritoryStatus.OCCUPIED,
                occupiedAt: now,
              },
              include: { faction: true },
            });

        const completedSession = await tx.readingSession.update({
          where: { sessionId: session.sessionId },
          data: {
            endTime: now,
            durationMinutes,
            startPage: dto.startPage,
            endPage: dto.endPage,
            status: ReadingSessionStatus.COMPLETED,
          },
        });

        await tx.user.update({
          where: { userId },
          data: { exp: { increment: EXP_REWARD } },
        });
        await tx.faction.update({
          where: { factionId: session.user.factionId },
          data: { totalScore: { increment: result.scoreDelta } },
        });
        await tx.territoryLog.create({
          data: {
            userId,
            libraryId: session.libraryId,
            factionId: session.user.factionId,
            sessionId: session.sessionId,
            scoreDelta: result.scoreDelta,
            hpBefore: result.hpBefore,
            hpAfter: result.hpAfter,
            actionType: result.actionType,
          },
        });
        const ranking = await this.refreshUserRanking(
          tx,
          userId,
          session.user.factionId,
        );

        return {
          exp: EXP_REWARD,
          influence: result.scoreDelta,
          occupiedFaction: territory.faction?.factionName ?? null,
          ranking: ranking.rankPosition,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private calculateTerritoryChange(
    territory: { factionId: number | null; hp: number } | null,
    userFactionId: number,
  ) {
    const hpBefore = territory?.hp ?? 0;
    const ownerFactionId = territory?.factionId ?? null;

    if (!ownerFactionId || ownerFactionId === userFactionId) {
      return {
        factionId: userFactionId,
        hpBefore,
        hpAfter: Math.min(TERRITORY_MAX_HP, hpBefore + TERRITORY_HP_DELTA),
        actionType: ownerFactionId
          ? TerritoryActionType.DEFENSE
          : TerritoryActionType.CAPTURE,
        scoreDelta: TERRITORY_HP_DELTA,
      };
    }

    if (hpBefore > TERRITORY_HP_DELTA) {
      return {
        factionId: ownerFactionId,
        hpBefore,
        hpAfter: hpBefore - TERRITORY_HP_DELTA,
        actionType: TerritoryActionType.ATTACK,
        scoreDelta: TERRITORY_HP_DELTA,
      };
    }

    return {
      factionId: userFactionId,
      hpBefore,
      hpAfter: TERRITORY_HP_DELTA,
      actionType: TerritoryActionType.CAPTURE,
      scoreDelta: TERRITORY_HP_DELTA,
    };
  }

  private async refreshUserRanking(
    tx: Prisma.TransactionClient,
    userId: number,
    factionId: number,
  ) {
    const [user, totalSessions, distinctBooks] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { userId } }),
      tx.readingSession.count({
        where: { userId, status: ReadingSessionStatus.COMPLETED },
      }),
      tx.readingSession.findMany({
        where: { userId, status: ReadingSessionStatus.COMPLETED },
        distinct: ['bookId'],
        select: { bookId: true },
      }),
    ]);
    const higherExpUsers = await tx.user.count({
      where: { exp: { gt: user.exp } },
    });

    return tx.ranking.upsert({
      where: { userId },
      update: {
        factionId,
        totalExp: user.exp,
        totalBooks: distinctBooks.length,
        totalSessions,
        rankPosition: higherExpUsers + 1,
      },
      create: {
        userId,
        factionId,
        totalExp: user.exp,
        totalBooks: distinctBooks.length,
        totalSessions,
        rankPosition: higherExpUsers + 1,
      },
    });
  }

  private getDistanceFromLibrary(
    point: { latitude: number; longitude: number },
    library: { latitude: number; longitude: number },
  ) {
    return getDistanceMeters(point, {
      latitude: library.latitude,
      longitude: library.longitude,
    });
  }

  private hasLocation(
    dto: StartSessionDto,
  ): dto is StartSessionDto & { latitude: number; longitude: number } {
    return dto.latitude !== undefined && dto.longitude !== undefined;
  }
}
