import { Global, Module } from '@nestjs/common';
import { GeminiClient } from './services/gemini.client';
import { GoogleOAuthClient } from './services/google-oauth.client';
import { KakaoOAuthClient } from './services/kakao-oauth.client';
import { KakaoLocalClient } from './services/kakao-local.client';
import { LibraryInfoClient } from './services/library-info.client';

@Global()
@Module({
  providers: [
    GeminiClient,
    GoogleOAuthClient,
    KakaoOAuthClient,
    KakaoLocalClient,
    LibraryInfoClient,
  ],
  exports: [
    GeminiClient,
    GoogleOAuthClient,
    KakaoOAuthClient,
    KakaoLocalClient,
    LibraryInfoClient,
  ],
})
export class IntegrationsModule {}
