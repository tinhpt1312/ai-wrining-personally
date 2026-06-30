import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Role } from 'src/types/auth.type';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from 'src/types/auth.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user?.role) {
      throwAppError(ERROR_CODE.ACCESS_DENIED);
    }

    if (!requiredRoles.includes(user.role)) {
      throwAppError(ERROR_CODE.FORBIDDEN_OPERATION);
    }

    return true;
  }
}
