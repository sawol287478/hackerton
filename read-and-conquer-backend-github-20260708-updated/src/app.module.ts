import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { validateEnv } from './config/env.validation';
import { FactionsModule } from './factions/factions.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LibrariesModule } from './libraries/libraries.module';
import { PrismaModule } from './prisma/prisma.module';
import { RankingModule } from './ranking/ranking.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
import { VerifyModule } from './verify/verify.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    IntegrationsModule,
    AuthModule,
    BooksModule,
    FactionsModule,
    UsersModule,
    LibrariesModule,
    SessionsModule,
    VerifyModule,
    RankingModule,
  ],
})
export class AppModule {}
