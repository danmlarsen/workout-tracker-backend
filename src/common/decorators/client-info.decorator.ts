import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface ClientInfo {
  ip: string;
  userAgent: string;
}

export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const ip =
      (request.get('x-forwarded-for') || '').split(',')[0] ||
      request.get('x-real-ip') ||
      request.socket.remoteAddress ||
      'Unknown';

    const userAgent = request.get('User-Agent') || 'Unknown';

    return { ip, userAgent };
  },
);
