import { HttpStatus, Injectable } from '@nestjs/common';
import {
  InfluenceActionType,
  LocationLogStatus,
  Prisma,
  ReadingSessionStatus,
} from '@prisma/client';
import {
  CHECK_IN_RADIUS_METERS,
  EXP_REWARD,
  MIN_READING_MINUTES,
  TERRITORY_HP_DELTA,
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
import { SubmitSessionDto } from './dto/submit-session.dto';

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
        where: { userId, status: ReadingSessionStatus.IN_PROGRESS },
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
      ? this.getDistanceFromLibrary(dto, library)
      : null;
    if (distanceMeters !== null && distanceMeters > CHECK_IN_RADIUS_METERS) {
      throw new BusinessException(
        BusinessCode.OUT_OF_LIBRARY_RADIUS,
        '도서관 반경 100m 이내에서만 독서를 시작할 수 있습니다.',
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
      description: externalBook?.description,
    };

    if (!bookData.title) {
      throw new BusinessException(
        BusinessCode.BOOK_NOT_FOUND,
        'Book title is required when Library Info API cannot resolve ISBN',
      );
    }
    const resolvedBookData = {
      ...bookData,
      title: bookData.title,
    };

    const session = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.upsert({
        where: { isbn: dto.isbn },
        update: resolvedBookData,
        create: resolvedBookData,
      });

      const created = await tx.readingSession.create({
        data: {
          userId,
          factionId: user.factionId,
          libraryId: dto.libraryId,
          bookId: book.bookId,
          startPage: dto.startPage,
          status: ReadingSessionStatus.IN_PROGRESS,
          isLocationValid: distanceMeters === null
            ? true
            : distanceMeters <= CHECK_IN_RADIUS_METERS,
        },
        include: { book: true },
      });

      if (distanceMeters !== null && this.hasLocation(dto)) {
        await tx.locationLog.create({
          data: {
            sessionId: created.sessionId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            distanceFromLibrary: distanceMeters,
            isOutOfRange: false,
            status: LocationLogStatus.NORMAL,
          },
        });
      }

      return created;
    });

    return {
      sessionId: session.sessionId,
      bookId: session.bookId,
      startTime: session.startTime,
      status: session.status,
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
    if (session.status !== ReadingSessionStatus.IN_PROGRESS) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_ACTIVE,
        'Session is not active',
      );
    }

    const distanceMeters = this.getDistanceFromLibrary(dto, session.library);
    const isOutOfRange = distanceMeters > CHECK_IN_RADIUS_METERS;
    const status = isOutOfRange
      ? LocationLogStatus.OUT_OF_RANGE
      : LocationLogStatus.NORMAL;

    await this.prisma.locationLog.create({
      data: {
        sessionId: session.sessionId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        distanceFromLibrary: distanceMeters,
        isOutOfRange,
        status,
      },
    });

    if (isOutOfRange) {
      await this.prisma.readingSession.update({
        where: { sessionId: session.sessionId },
        data: { isLocationValid: false },
      });
    }

    return {
      sessionId: session.sessionId,
      distanceFromLibrary: Math.round(distanceMeters),
      isOutOfRange,
      status,
    };
  }

  async submit(userId: number, sessionId: number, dto: SubmitSessionDto) {
    const session = await this.prisma.readingSession.findFirst({
      where: { sessionId, userId },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.readingSession.update({
      where: { sessionId },
      data: {
        startPage: dto.startPage,
        endPage: dto.endPage,
        submittedAt: new Date(),
        status: ReadingSessionStatus.SUBMITTED,
      },
    });

    await this.prisma.aiVerification.upsert({
      where: { sessionId },
      update: {
        submittedCoverImageUrl: dto.submittedCoverImageUrl,
        reviewText: dto.reviewText,
      },
      create: {
        sessionId,
        submittedCoverImageUrl: dto.submittedCoverImageUrl,
        reviewText: dto.reviewText,
      },
    });

    return {
      sessionId,
      status: ReadingSessionStatus.SUBMITTED,
      message: '인증 정보가 제출되었습니다.',
    };
  }

  async complete(userId: number, dto: CompleteSessionDto) {
    return this.completeBySessionId(userId, dto.sessionId, dto);
  }

  async completeBySessionId(
    userId: number,
    sessionId: number,
    dto?: Partial<CompleteSessionDto>,
  ) {
    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        const session = await tx.readingSession.findFirst({
          where: { sessionId, userId },
          include: {
            user: true,
            book: true,
            library: {
              include: { currentOccupiedFaction: true },
            },
            aiVerification: true,
          },
        });

        if (!session) {
          throw new BusinessException(
            BusinessCode.SESSION_NOT_FOUND,
            'Session not found',
            HttpStatus.NOT_FOUND,
          );
        }
        if (!session.user.factionId) {
          throw new BusinessException(
            BusinessCode.PROFILE_NOT_COMPLETED,
            'Profile must be completed before completing a session',
          );
        }

        const startPage = dto?.startPage ?? session.startPage;
        const endPage = dto?.endPage ?? session.endPage;
        if (startPage === null || startPage === undefined || !endPage) {
          throw new BusinessException(
            BusinessCode.INVALID_PAGE_RANGE,
            'Start page and end page are required',
          );
        }
        if (endPage < startPage) {
          throw new BusinessException(
            BusinessCode.INVALID_PAGE_RANGE,
            'End page must be greater than or equal to start page',
          );
        }

        const durationMinutes = Math.floor(
          (now.getTime() - session.startTime.getTime()) / 60000,
        );
        const isMinimumTimeMet = durationMinutes >= MIN_READING_MINUTES;
        const locationValidationPassed = session.isLocationValid;
        const pageValidationPassed = this.validatePageProgress(
          startPage,
          endPage,
          durationMinutes,
        );

        const coverImageUrl = dto?.coverImageUrl;
        const reviewText = dto?.reviewText;
        const ai = coverImageUrl && reviewText
          ? await this.aiVerification.verify({
              bookTitle: session.book.title,
              expectedCoverImageUrl: session.book.coverImageUrl,
              submittedCoverImageUrl: coverImageUrl,
              reviewText,
            })
          : {
              visionConfidence: session.aiVerification?.visionConfidence ?? 1,
              llmConfidence: session.aiVerification?.llmConfidence ?? 1,
              isPassed: session.aiVerification?.isPassed ?? true,
              failReason: session.aiVerification?.failReason ?? null,
            };

        const visionPassed = ai.visionConfidence >= 0.7;
        const llmPassed = ai.llmConfidence >= 0.7;
        const isPassed =
          visionPassed &&
          llmPassed &&
          pageValidationPassed &&
          locationValidationPassed &&
          isMinimumTimeMet;

        await tx.aiVerification.upsert({
          where: { sessionId },
          update: {
            submittedCoverImageUrl:
              coverImageUrl ?? session.aiVerification?.submittedCoverImageUrl,
            registeredCoverImageUrl: session.book.coverImageUrl,
            reviewText: reviewText ?? session.aiVerification?.reviewText,
            visionConfidence: ai.visionConfidence,
            llmConfidence: ai.llmConfidence,
            visionPassed,
            llmPassed,
            pageValidationPassed,
            locationValidationPassed,
            isPassed,
            failReason: isPassed ? null : ai.failReason ?? '인증 조건을 충족하지 못했습니다.',
            modelName: 'gemini-1.5-flash',
            verifiedAt: now,
          },
          create: {
            sessionId,
            submittedCoverImageUrl: coverImageUrl,
            registeredCoverImageUrl: session.book.coverImageUrl,
            reviewText,
            visionConfidence: ai.visionConfidence,
            llmConfidence: ai.llmConfidence,
            visionPassed,
            llmPassed,
            pageValidationPassed,
            locationValidationPassed,
            isPassed,
            failReason: isPassed ? null : ai.failReason ?? '인증 조건을 충족하지 못했습니다.',
            modelName: 'gemini-1.5-flash',
            verifiedAt: now,
          },
        });

        if (!isPassed) {
          await tx.readingSession.update({
            where: { sessionId },
            data: {
              endTime: now,
              durationMinutes,
              startPage,
              endPage,
              isMinimumTimeMet,
              status: ReadingSessionStatus.VERIFICATION_FAILED,
              failReason: ai.failReason ?? '인증 조건을 충족하지 못했습니다.',
              completedAt: now,
            },
          });

          return {
            sessionId,
            status: ReadingSessionStatus.VERIFICATION_FAILED,
            reward: { exp: 0, influence: 0 },
            failReason: ai.failReason ?? '인증 조건을 충족하지 못했습니다.',
          };
        }

        const previousFactionId = session.library.currentOccupiedFactionId;
        const previousFactionName =
          session.library.currentOccupiedFaction?.factionName ?? null;
        const influence = await tx.libraryInfluence.upsert({
          where: {
            libraryId_factionId: {
              libraryId: session.libraryId,
              factionId: session.user.factionId,
            },
          },
          update: {
            influenceScore: { increment: TERRITORY_HP_DELTA },
            lastContributedAt: now,
          },
          create: {
            libraryId: session.libraryId,
            factionId: session.user.factionId,
            influenceScore: TERRITORY_HP_DELTA,
            lastContributedAt: now,
          },
        });
        const influenceBefore = influence.influenceScore - TERRITORY_HP_DELTA;
        const influenceAfter = influence.influenceScore;

        const allInfluences = await tx.libraryInfluence.findMany({
          where: { libraryId: session.libraryId },
          include: { faction: true },
        });
        const winner = this.resolveWinningFaction(
          allInfluences,
          previousFactionId,
        );
        const isOccupationChanged = winner.factionId !== previousFactionId;

        await tx.library.update({
          where: { libraryId: session.libraryId },
          data: { currentOccupiedFactionId: winner.factionId },
        });

        await tx.influenceLog.create({
          data: {
            userId,
            libraryId: session.libraryId,
            factionId: session.user.factionId,
            sessionId,
            scoreDelta: TERRITORY_HP_DELTA,
            influenceBefore,
            influenceAfter,
            previousOccupiedFactionId: previousFactionId,
            newOccupiedFactionId: winner.factionId,
            isOccupationChanged,
            actionType: isOccupationChanged
              ? InfluenceActionType.OCCUPATION_CHANGED
              : previousFactionId === session.user.factionId
                ? InfluenceActionType.INFLUENCE_GAINED
                : InfluenceActionType.OCCUPATION_MAINTAINED,
          },
        });

        await tx.readingSession.update({
          where: { sessionId },
          data: {
            endTime: now,
            durationMinutes,
            startPage,
            endPage,
            isMinimumTimeMet,
            status: ReadingSessionStatus.VERIFICATION_PASSED,
            completedAt: now,
          },
        });
        await tx.user.update({
          where: { userId },
          data: { exp: { increment: EXP_REWARD } },
        });
        await tx.faction.update({
          where: { factionId: session.user.factionId },
          data: { totalScore: { increment: TERRITORY_HP_DELTA } },
        });
        const ranking = await this.refreshUserRanking(
          tx,
          userId,
          session.user.factionId,
        );

        return {
          sessionId,
          status: ReadingSessionStatus.VERIFICATION_PASSED,
          reward: {
            exp: EXP_REWARD,
            influence: TERRITORY_HP_DELTA,
          },
          occupation: {
            previousFaction: previousFactionName,
            currentFaction: winner.faction.factionName,
            changed: isOccupationChanged,
          },
          ranking: {
            userRank: ranking.rankPosition,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private validatePageProgress(
    startPage: number,
    endPage: number,
    durationMinutes: number,
  ) {
    const readPages = endPage - startPage + 1;
    if (readPages <= 0) {
      return false;
    }
    return readPages <= Math.max(20, durationMinutes * 5);
  }

  private resolveWinningFaction(
    influences: Array<{
      factionId: number;
      influenceScore: number;
      faction: { factionName: string };
    }>,
    previousFactionId: number | null,
  ) {
    const highestScore = Math.max(
      ...influences.map((influence) => influence.influenceScore),
      0,
    );
    const tied = influences.filter(
      (influence) => influence.influenceScore === highestScore,
    );
    return (
      tied.find((influence) => influence.factionId === previousFactionId) ??
      tied[0]
    );
  }

  private async refreshUserRanking(
    tx: Prisma.TransactionClient,
    userId: number,
    factionId: number,
  ) {
    const [user, totalSessions, distinctBooks] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { userId } }),
      tx.readingSession.count({
        where: { userId, status: ReadingSessionStatus.VERIFICATION_PASSED },
      }),
      tx.readingSession.findMany({
        where: { userId, status: ReadingSessionStatus.VERIFICATION_PASSED },
        distinct: ['bookId'],
        select: { bookId: true },
      }),
    ]);
    const higherExpUsers = await tx.user.count({
      where: { exp: { gt: user.exp } },
    });

    return tx.userRanking.upsert({
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
