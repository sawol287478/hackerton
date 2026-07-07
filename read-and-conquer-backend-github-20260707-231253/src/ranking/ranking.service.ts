import { Injectable } from '@nestjs/common';
import { TerritoryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFactionRankings() {
    const [factions, occupiedCount] = await Promise.all([
      this.prisma.faction.findMany({
        orderBy: { totalScore: 'desc' },
        include: {
          territories: {
            where: { status: TerritoryStatus.OCCUPIED },
            select: { territoryId: true },
          },
        },
      }),
      this.prisma.libraryTerritory.count({
        where: { status: TerritoryStatus.OCCUPIED },
      }),
    ]);

    return factions.map((faction, index) => {
      const capturedLibraryCount = faction.territories.length;
      return {
        rank: index + 1,
        factionId: faction.factionId,
        faction: faction.factionName,
        color: faction.factionColor,
        totalScore: faction.totalScore,
        occupiedLibraryCount: capturedLibraryCount,
        captureRate:
          occupiedCount === 0
            ? 0
            : Number(((capturedLibraryCount / occupiedCount) * 100).toFixed(2)),
      };
    });
  }

  async getUserRankings(limit: number) {
    const rankings = await this.prisma.user.findMany({
      where: {
        nickname: { not: null },
        factionId: { not: null },
      },
      orderBy: [{ exp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: { faction: true },
    });

    return rankings.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      nickname: user.nickname,
      faction: user.faction?.factionName ?? null,
      exp: user.exp,
    }));
  }
}
