import { HttpStatus, Injectable } from '@nestjs/common';
import { AI_PASS_THRESHOLD } from '../common/constants/game.constants';
import { BusinessCode } from '../common/exceptions/business-code';
import { BusinessException } from '../common/exceptions/business.exception';
import { GeminiClient } from '../integrations/services/gemini.client';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyLlmDto } from './dto/verify-llm.dto';
import { VerifyVisionDto } from './dto/verify-vision.dto';

@Injectable()
export class VerifyService {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly prisma: PrismaService,
  ) {}

  async verifyVision(dto: VerifyVisionDto) {
    const session = await this.prisma.readingSession.findUnique({
      where: { sessionId: dto.sessionId },
      include: { book: true },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const result = await this.gemini.verifyReading({
      bookTitle: session.book.title,
      author: session.book.author,
      expectedCoverImageUrl: session.book.coverImageUrl,
      submittedImageBase64: dto.image,
      submittedCoverImageUrl: dto.image.startsWith('http') ? dto.image : undefined,
      reviewText: `${session.book.title} cover validation request. This is a vision-only check.`,
    });
    const confidence = result?.visionConfidence ?? 0.8;

    return {
      sessionId: dto.sessionId,
      visionConfidence: confidence,
      isPassed: confidence >= AI_PASS_THRESHOLD,
      provider: result ? 'gemini' : 'fallback',
    };
  }

  async verifyLlm(dto: VerifyLlmDto) {
    const session = await this.prisma.readingSession.findUnique({
      where: { sessionId: dto.sessionId },
      include: { book: true },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const result = await this.gemini.verifyReading({
      bookTitle: session.book.title,
      author: session.book.author,
      submittedCoverImageUrl: 'text-only',
      reviewText: dto.review,
    });
    const confidence =
      result?.llmConfidence ??
      Math.min(0.95, Math.max(0.65, dto.review.length / 300));

    return {
      sessionId: dto.sessionId,
      llmConfidence: confidence,
      isPassed: confidence >= AI_PASS_THRESHOLD,
      provider: result ? 'gemini' : 'fallback',
    };
  }
}
