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
      nickname: user.nickname,
      exp: user.exp,
      faction: user.faction?.factionName ?? null,
    };
  }
}
