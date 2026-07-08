import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RankingService } from './ranking.service';

class UserRankingQuery {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('factions')
  async factions() {
    return this.rankingService.getFactionRankings();
  }

  @Get('users')
  async users(@Query() query: UserRankingQuery) {
    return this.rankingService.getUserRankings(query.limit ?? 50);
  }
}
