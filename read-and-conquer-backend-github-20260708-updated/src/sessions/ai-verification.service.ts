import { Injectable } from '@nestjs/common';
import { AI_PASS_THRESHOLD } from '../common/constants/game.constants';
import { GeminiClient } from '../integrations/services/gemini.client';

interface MockAiInput {
  bookTitle: string;
  expectedCoverImageUrl?: string | null;
  submittedCoverImageUrl: string;
  reviewText: string;
}

@Injectable()
export class AiVerificationService {
  constructor(private readonly gemini: GeminiClient) {}

  async verify(input: MockAiInput) {
    const geminiResult = await this.gemini.verifyReading({
      bookTitle: input.bookTitle,
      expectedCoverImageUrl: input.expectedCoverImageUrl,
      submittedCoverImageUrl: input.submittedCoverImageUrl,
      reviewText: input.reviewText,
    });
    if (geminiResult) {
      return geminiResult;
    }

    const hasImage = Boolean(input.submittedCoverImageUrl);
    const sameCover =
      input.expectedCoverImageUrl &&
      input.submittedCoverImageUrl === input.expectedCoverImageUrl;
    const mentionsTitle = input.reviewText.includes(input.bookTitle);
    const reviewLengthScore = Math.min(input.reviewText.length / 200, 1);

    const visionConfidence = sameCover ? 0.95 : hasImage ? 0.8 : 0.2;
    const llmConfidence = Math.max(
      mentionsTitle ? 0.86 : 0.72,
      reviewLengthScore * 0.85,
    );
    const isPassed =
      visionConfidence >= AI_PASS_THRESHOLD &&
      llmConfidence >= AI_PASS_THRESHOLD;

    return {
      visionConfidence,
      llmConfidence,
      isPassed,
      failReason: isPassed
        ? null
        : 'Vision or LLM confidence did not meet the threshold',
    };
  }
}
