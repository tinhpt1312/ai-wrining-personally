import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { ENV } from 'src/config';
import { Role } from 'src/types/auth.type';
import { JwtPayload } from 'src/types/auth.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          const cookieName = ENV.JWT.COOKIE_NAME || 'jwt_token';
          const legacyCookieName =
            ENV.COOKIE.ACCESS_TOKEN_NAME || 'access_token';
          return req?.cookies?.[cookieName] ?? req?.cookies?.[legacyCookieName];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: ENV.JWT.SECRET || '',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throwAppError(ERROR_CODE.TOKEN_INVALID);
    }

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role ?? Role.USER,
    };
  }
}
