import { UnauthorizedException } from '@nestjs/common';

export class EmailNotConfirmedException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Email not confirmed',
      code: 'EMAIL_NOT_CONFIRMED',
    });
  }
}
