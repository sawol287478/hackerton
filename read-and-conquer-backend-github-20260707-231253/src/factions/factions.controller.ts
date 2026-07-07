import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  async create(@Body() dto: CreateFactionDto) {
    return this.factionsService.create(dto);
  }
}
