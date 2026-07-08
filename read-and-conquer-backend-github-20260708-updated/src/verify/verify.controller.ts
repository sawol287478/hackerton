import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VerifyLlmDto } from './dto/verify-llm.dto';
import { VerifyVisionDto } from './dto/verify-vision.dto';
import { VerifyService } from './verify.service';

@UseGuards(JwtAuthGuard)
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('vision')
  async vision(@Body() dto: VerifyVisionDto) {
    return this.verifyService.verifyVision(dto);
  }

  @Post('llm')
  async llm(@Body() dto: VerifyLlmDto) {
    return this.verifyService.verifyLlm(dto);
  }

  @Get(':sessionId')
  async result(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.verifyService.getResult(sessionId);
  }
}
