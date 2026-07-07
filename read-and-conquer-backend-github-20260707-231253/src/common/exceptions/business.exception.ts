import { HttpException, HttpStatus } from '@nestjs/common';
import { BusinessCode } from './business-code';

export class BusinessException extends HttpException {
  constructor(
    readonly code: BusinessCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
