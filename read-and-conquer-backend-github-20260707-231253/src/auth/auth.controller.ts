import { Body, Controller, Post } from '@nestjs/common';
import { ok } from '../common/responses/api-response';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
