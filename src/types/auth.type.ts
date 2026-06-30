import { Request } from 'express';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export const ALL_ROLES = Object.values(Role);

export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  role: Role;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email?: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
