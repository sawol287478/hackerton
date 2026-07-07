import { Module } from '@nestjs/common';
import { AiVerificationService } from './ai-verification.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, AiVerificationService],
})
export class SessionsModule {}
