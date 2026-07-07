import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ok } from '../common/responses/api-response';
import { RequestUser } from '../common/types/request-user';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { PingSessionDto } from './dto/ping-session.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionsService } from './sessions.service';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  async start(@CurrentUser() user: RequestUser, @Body() dto: StartSessionDto) {
    return this.sessionsService.start(user.userId, dto);
  }

  @Post('ping')
  async ping(@CurrentUser() user: RequestUser, @Body() dto: PingSessionDto) {
    return this.sessionsService.ping(user.userId, dto);
  }

  @Post('complete')
  async complete(
    @CurrentUser() user: RequestUser,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.sessionsService.complete(user.userId, dto);
  }
}
