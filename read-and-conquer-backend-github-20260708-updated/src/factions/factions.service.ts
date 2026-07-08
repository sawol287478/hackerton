import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFactionDto } from './dto/create-faction.dto';

@Injectable()
export class FactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const factions = await this.prisma.faction.findMany({
      orderBy: { factionId: 'asc' },
      where: { isActive: true },
      include: {
        _count: { select: { users: true } },
      },
    });

    return factions.map((faction) => ({
      factionId: faction.factionId,
      name: faction.factionName,
      color: faction.factionColor,
      joinType: faction.joinType,
      description: faction.description,
      totalScore: faction.totalScore,
      memberCount: faction._count.users,
    }));
  }

  async create(dto: CreateFactionDto, createdByUserId?: number) {
    const faction = await this.prisma.faction.create({
      data: {
        factionName: dto.name,
        factionColor: dto.color,
        joinType: dto.joinType,
        description: dto.description,
        createdByUserId,
      },
    });

    return {
      factionId: faction.factionId,
      message: '진영 생성 완료',
    };
  }
}
