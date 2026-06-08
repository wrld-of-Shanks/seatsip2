import { Request } from 'express';

export type UserRole = 'USER' | 'ADMIN' | 'CAFE_OWNER';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  jti: string;
}

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthUser;
  requestId?: string;
}

