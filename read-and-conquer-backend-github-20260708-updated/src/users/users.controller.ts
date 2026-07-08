import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @Get('check-nickname')
  async checkNickname(@Query('nickname') nickname: string) {
    return this.usersService.checkNickname(nickname);
  }

  @Get('me/books')
  async myBooks(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.usersService.getMyBooks(
      user.userId,
      Number(page ?? 1),
      Number(size ?? 20),
    );
  }

  @Get('me/sessions')
  async mySessions(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.usersService.getMySessions(
      user.userId,
      Number(page ?? 1),
      Number(size ?? 20),
    );
  }

  @Get('me/libraries')
  async myLibraries(@CurrentUser() user: RequestUser) {
    return this.usersService.getMyLibraries(user.userId);
  }
}
