import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessCode } from '../common/exceptions/business-code';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BusinessException(
        BusinessCode.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (user.factionId && user.factionId !== dto.factionId) {
      throw new BusinessException(
        BusinessCode.FACTION_ALREADY_SET,
        'Faction cannot be changed after onboarding',
      );
    }

    const faction = await this.prisma.faction.findUnique({
      where: { factionId: dto.factionId },
    });
    if (!faction) {
      throw new BusinessException(
        BusinessCode.PROFILE_NOT_COMPLETED,
        'Faction not found',
      );
    }

    try {
      return await this.prisma.user.update({
        where: { userId },
        data: {
          nickname: dto.nickname,
          factionId: dto.factionId,
          onboardingCompleted: true,
        },
        include: { faction: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BusinessException(
          BusinessCode.DUPLICATED_NICKNAME,
          'Nickname is already in use',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        faction: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 20,
          include: {
            book: true,
            library: true,
            aiVerification: true,
          },
        },
        ranking: true,
      },
    });

    if (!user) {
      throw new BusinessException(
        BusinessCode.USER_NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      exp: user.exp,
      onboardingCompleted: user.onboardingCompleted,
      faction: user.faction
        ? {
            factionId: user.faction.factionId,
            name: user.faction.factionName,
            color: user.faction.factionColor,
          }
        : null,
      ranking: user.ranking
        ? {
            rankPosition: user.ranking.rankPosition,
            totalBooks: user.ranking.totalBooks,
            totalSessions: user.ranking.totalSessions,
          }
        : null,
    };
  }

  async checkNickname(nickname: string) {
    const user = await this.prisma.user.findUnique({ where: { nickname } });
    return {
      nickname,
      available: !user,
    };
  }

  async getMyBooks(userId: number, page = 1, size = 20) {
    const sessions = await this.prisma.readingSession.findMany({
      where: { userId, status: 'VERIFICATION_PASSED' },
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
      distinct: ['bookId'],
      include: { book: true },
    });

    return sessions.map((session) => ({
      bookId: session.book.bookId,
      isbn: session.book.isbn,
      title: session.book.title,
      author: session.book.author,
      publisher: session.book.publisher,
      coverImageUrl: session.book.coverImageUrl,
      completedAt: session.completedAt,
    }));
  }

  async getMySessions(userId: number, page = 1, size = 20) {
    const sessions = await this.prisma.readingSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * size,
      take: size,
      include: { book: true, library: true, aiVerification: true },
    });

    return sessions.map((session) => ({
      sessionId: session.sessionId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      startPage: session.startPage,
      endPage: session.endPage,
      library: {
        libraryId: session.library.libraryId,
        name: session.library.libraryName,
      },
      book: {
        bookId: session.book.bookId,
        isbn: session.book.isbn,
        title: session.book.title,
      },
      verificationPassed: session.aiVerification?.isPassed ?? false,
    }));
  }

  async getMyLibraries(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { factionId: true },
    });
    if (!user?.factionId) {
      return [];
    }

    const influences = await this.prisma.libraryInfluence.findMany({
      where: { factionId: user.factionId, influenceScore: { gt: 0 } },
      orderBy: { influenceScore: 'desc' },
      include: {
        library: { include: { currentOccupiedFaction: true } },
      },
    });

    return influences.map((influence) => ({
      libraryId: influence.library.libraryId,
      libraryName: influence.library.libraryName,
      address: influence.library.address,
      influenceScore: influence.influenceScore,
      occupied: influence.library.currentOccupiedFactionId === user.factionId,
      currentOccupiedFaction: influence.library.currentOccupiedFaction
        ? {
            factionId: influence.library.currentOccupiedFaction.factionId,
            name: influence.library.currentOccupiedFaction.factionName,
            color: influence.library.currentOccupiedFaction.factionColor,
          }
        : null,
    }));
  }
}
