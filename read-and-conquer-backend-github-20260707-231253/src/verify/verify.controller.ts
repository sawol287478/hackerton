import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ok } from '../common/responses/api-response';
import { VerifyLlmDto } from './dto/verify-llm.dto';
import { VerifyVisionDto } from './dto/verify-vision.dto';
import { VerifyService } from './verify.service';

@UseGuards(JwtAuthGuard)
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('vision')
  async vision(@Body() dto: VerifyVisionDto) {
    return ok(await this.verifyService.verifyVision(dto));
  }

  @Post('llm')
  async llm(@Body() dto: VerifyLlmDto) {
    return ok(await this.verifyService.verifyLlm(dto));
  }
}
