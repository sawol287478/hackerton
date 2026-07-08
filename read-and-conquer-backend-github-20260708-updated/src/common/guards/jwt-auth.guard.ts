import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestUser } from '../types/request-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      const payload = this.jwtService.verify<RequestUser>(token);
      request.user = { userId: payload.userId, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }
}
