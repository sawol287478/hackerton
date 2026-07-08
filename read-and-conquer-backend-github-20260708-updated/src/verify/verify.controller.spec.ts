import { VerifyController } from './verify.controller';

describe('VerifyController', () => {
  it('6.1 verifies a book cover image without a response wrapper', async () => {
    const verifyService = {
      verifyVision: jest.fn().mockResolvedValue({
        sessionId: 31,
        visionConfidence: 0.84,
        isPassed: true,
        provider: 'gemini',
      }),
    };
    const controller = new VerifyController(verifyService as any);
    const dto = { sessionId: 31, image: 'base64...' };

    await expect(controller.vision(dto)).resolves.toEqual({
      sessionId: 31,
      visionConfidence: 0.84,
      isPassed: true,
      provider: 'gemini',
    });
  });

  it('6.2 verifies a review without a response wrapper', async () => {
    const verifyService = {
      verifyLlm: jest.fn().mockResolvedValue({
        sessionId: 31,
        llmConfidence: 0.82,
        isPassed: true,
        provider: 'gemini',
      }),
    };
    const controller = new VerifyController(verifyService as any);
    const dto = { sessionId: 31, review: '책을 읽고...' };

    await expect(controller.llm(dto)).resolves.toEqual({
      sessionId: 31,
      llmConfidence: 0.82,
      isPassed: true,
      provider: 'gemini',
    });
  });
});
