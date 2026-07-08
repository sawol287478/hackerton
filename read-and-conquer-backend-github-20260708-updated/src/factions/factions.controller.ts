import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user';
import { CreateFactionDto } from './dto/create-faction.dto';
import { FactionsService } from './factions.service';

@UseGuards(JwtAuthGuard)
@Controller('factions')
export class FactionsController {
  constructor(private readonly factionsService: FactionsService) {}

  @Get()
  async list() {
    return this.factionsService.list();
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateFactionDto) {
    return this.factionsService.create(dto, user.userId);
  }
}
