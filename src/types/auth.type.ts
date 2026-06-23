import { Request } from 'express';
import { Role } from 'src/common/enums/role.enum';

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
