import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ok } from '../common/responses/api-response';
import { RequestUser } from '../common/types/request-user';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('profile')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.usersService.updateProfile(user.userId, dto);
    return { message: '프로필 등록 완료' };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.usersService.getMe(user.userId);
  }
}
