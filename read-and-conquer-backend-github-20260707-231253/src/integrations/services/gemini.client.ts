import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeminiVerificationResult {
  visionConfidence: number;
  llmConfidence: number;
  isPassed: boolean;
  failReason: string | null;
}

@Injectable()
export class GeminiClient {
  constructor(private readonly config: ConfigService) {}

  async verifyReading(input: {
    bookTitle: string;
    author?: string | null;
    expectedCoverImageUrl?: string | null;
    submittedCoverImageUrl?: string;
    submittedImageBase64?: string;
    reviewText: string;
  }): Promise<GeminiVerificationResult | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      return null;
    }

    const imagePart = await this.createImagePart(input);
    const prompt = [
      'You are validating a gamified reading session.',
      'Return only JSON with keys: visionConfidence, llmConfidence, isPassed, failReason.',
      'Scores must be numbers between 0 and 1.',
      `Book title: ${input.bookTitle}`,
      `Author: ${input.author ?? 'unknown'}`,
      `Expected cover URL: ${input.expectedCoverImageUrl ?? 'unknown'}`,
      `Review: ${input.reviewText}`,
    ].join('\n');

    const parts = [{ text: prompt }, ...(imagePart ? [imagePart] : [])];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const json = await response.json();
    const text = String(
      json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}',
    );
    try {
      return this.parseJsonResult(text);
    } catch {
      return null;
    }
  }

  private async createImagePart(input: {
    submittedCoverImageUrl?: string;
    submittedImageBase64?: string;
  }) {
    if (input.submittedImageBase64) {
      return {
        inline_data: {
          mime_type: this.detectBase64MimeType(input.submittedImageBase64),
          data: this.stripBase64Prefix(input.submittedImageBase64),
        },
      };
    }

    const imageUrl = input.submittedCoverImageUrl;
    if (!imageUrl?.startsWith('http')) {
      return null;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      inline_data: {
        mime_type: contentType,
        data: buffer.toString('base64'),
      },
    };
  }

  private stripBase64Prefix(value: string) {
    return value.includes(',') ? value.split(',').at(-1) ?? value : value;
  }

  private detectBase64MimeType(value: string) {
    const match = value.match(/^data:(.+);base64,/);
    return match?.[1] ?? 'image/jpeg';
  }

  private parseJsonResult(text: string): GeminiVerificationResult {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? text);
    const visionConfidence = this.clamp(Number(parsed.visionConfidence));
    const llmConfidence = this.clamp(Number(parsed.llmConfidence));
    return {
      visionConfidence,
      llmConfidence,
      isPassed: Boolean(parsed.isPassed),
      failReason: parsed.failReason ? String(parsed.failReason) : null,
    };
  }

  private clamp(value: number) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, value));
  }
}
