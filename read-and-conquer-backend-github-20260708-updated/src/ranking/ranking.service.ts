import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFactionRankings() {
    const factions = await this.prisma.faction.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { createdLibraries: true },
        },
        influences: {
          select: { influenceScore: true },
        },
      },
    });

    return factions
      .map((faction) => {
        const totalInfluence = faction.influences.reduce(
          (sum, influence) => sum + influence.influenceScore,
          0,
        );
        return {
          factionId: faction.factionId,
          name: faction.factionName,
          color: faction.factionColor,
          totalInfluence,
          occupiedLibraryCount: faction._count.createdLibraries,
        };
      })
      .sort((a, b) => {
        if (b.occupiedLibraryCount !== a.occupiedLibraryCount) {
          return b.occupiedLibraryCount - a.occupiedLibraryCount;
        }
        return b.totalInfluence - a.totalInfluence;
      })
      .map((faction, index) => ({
        rank: index + 1,
        ...faction,
      }));
  }

  async getUserRankings(limit: number) {
    const rankings = await this.prisma.user.findMany({
      where: {
        nickname: { not: null },
        factionId: { not: null },
      },
      orderBy: [{ exp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        faction: true,
        sessions: {
          where: { status: 'VERIFICATION_PASSED' },
          select: { bookId: true },
        },
      },
    });

    return rankings.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      nickname: user.nickname,
      faction: user.faction
        ? {
            factionId: user.faction.factionId,
            name: user.faction.factionName,
            color: user.faction.factionColor,
          }
        : null,
      totalExp: user.exp,
      totalBooks: new Set(user.sessions.map((session) => session.bookId)).size,
    }));
  }
}
