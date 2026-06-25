import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV } from 'src/config';
import { Role } from 'src/common/enums/role.enum';
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
      throw new UnauthorizedException('Token không hợp lệ');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role ?? Role.USER,
    };
  }
}
