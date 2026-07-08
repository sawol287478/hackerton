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
      include: { book: true, aiVerification: true },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const submittedImage = dto.image ?? dto.submittedCoverImageUrl;
    if (!submittedImage) {
      throw new BusinessException(
        BusinessCode.AI_VERIFICATION_FAILED,
        'Submitted cover image is required',
      );
    }

    const result = await this.gemini.verifyReading({
      bookTitle: session.book.title,
      author: session.book.author,
      expectedCoverImageUrl: session.book.coverImageUrl,
      submittedImageBase64: submittedImage.startsWith('http')
        ? undefined
        : submittedImage,
      submittedCoverImageUrl: submittedImage.startsWith('http')
        ? submittedImage
        : dto.submittedCoverImageUrl,
      reviewText: `${session.book.title} cover validation request. This is a vision-only check.`,
    });
    const confidence = result?.visionConfidence ?? 0.8;
    const visionPassed = confidence >= AI_PASS_THRESHOLD;

    const verification = await this.prisma.aiVerification.upsert({
      where: { sessionId: dto.sessionId },
      update: {
        submittedCoverImageUrl: dto.submittedCoverImageUrl ?? session.aiVerification?.submittedCoverImageUrl,
        registeredCoverImageUrl: session.book.coverImageUrl,
        visionConfidence: confidence,
        visionPassed,
        isPassed: visionPassed && (session.aiVerification?.llmPassed ?? false),
        modelName: result ? 'gemini' : 'fallback',
        verifiedAt: new Date(),
      },
      create: {
        sessionId: dto.sessionId,
        submittedCoverImageUrl: dto.submittedCoverImageUrl,
        registeredCoverImageUrl: session.book.coverImageUrl,
        visionConfidence: confidence,
        visionPassed,
        isPassed: false,
        modelName: result ? 'gemini' : 'fallback',
        verifiedAt: new Date(),
      },
    });

    return {
      sessionId: dto.sessionId,
      visionConfidence: verification.visionConfidence,
      visionPassed: verification.visionPassed,
      isPassed: verification.visionPassed,
      provider: result ? 'gemini' : 'fallback',
    };
  }

  async verifyLlm(dto: VerifyLlmDto) {
    const session = await this.prisma.readingSession.findUnique({
      where: { sessionId: dto.sessionId },
      include: { book: true, aiVerification: true },
    });
    if (!session) {
      throw new BusinessException(
        BusinessCode.SESSION_NOT_FOUND,
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const reviewText = dto.reviewText ?? dto.review;
    if (!reviewText) {
      throw new BusinessException(
        BusinessCode.AI_VERIFICATION_FAILED,
        'Review text is required',
      );
    }

    const result = await this.gemini.verifyReading({
      bookTitle: session.book.title,
      author: session.book.author,
      submittedCoverImageUrl: 'text-only',
      reviewText,
    });
    const confidence =
      result?.llmConfidence ??
      Math.min(0.95, Math.max(0.65, reviewText.length / 300));
    const llmPassed = confidence >= AI_PASS_THRESHOLD;

    const verification = await this.prisma.aiVerification.upsert({
      where: { sessionId: dto.sessionId },
      update: {
        reviewText,
        llmConfidence: confidence,
        llmPassed,
        isPassed: (session.aiVerification?.visionPassed ?? false) && llmPassed,
        modelName: result ? 'gemini' : 'fallback',
        verifiedAt: new Date(),
      },
      create: {
        sessionId: dto.sessionId,
        reviewText,
        llmConfidence: confidence,
        llmPassed,
        isPassed: false,
        modelName: result ? 'gemini' : 'fallback',
        verifiedAt: new Date(),
      },
    });

    return {
      sessionId: dto.sessionId,
      llmConfidence: verification.llmConfidence,
      llmPassed: verification.llmPassed,
      isPassed: verification.llmPassed,
      provider: result ? 'gemini' : 'fallback',
    };
  }

  async getResult(sessionId: number) {
    const verification = await this.prisma.aiVerification.findUnique({
      where: { sessionId },
    });
    if (!verification) {
      throw new BusinessException(
        BusinessCode.AI_VERIFICATION_FAILED,
        'Verification result not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return verification;
  }
}
