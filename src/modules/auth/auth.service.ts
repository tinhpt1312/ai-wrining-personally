import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { ENV } from 'src/config';
import { User } from 'src/entities';
import { Repository } from 'typeorm';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Role } from 'src/types/auth.type';
import { JwtPayload } from 'src/types/auth.type';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDTO) {
    const { username, password } = dto;
    const email = this.validateEmail(dto.email);
    this.validatePassword(password);

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throwAppError(ERROR_CODE.USERNAME_EXISTS);
      }
      throwAppError(ERROR_CODE.EMAIL_ALREADY_USED);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepository.save(
      this.userRepository.create({
        username,
        password: hashedPassword,
        email,
        role: Role.USER,
      }),
    );

    return { success: true };
  }

  private validateEmail(email?: string): string {
    const normalized = email?.trim();

    if (!normalized) {
      throwAppError(ERROR_CODE.EMAIL_REQUIRED);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throwAppError(ERROR_CODE.EMAIL_INVALID);
    }

    return normalized;
  }

  private validatePassword(password?: string): void {
    if (!password) {
      throwAppError(ERROR_CODE.PASSWORD_REQUIRED);
    }

    if (password.length < 6) {
      throwAppError(ERROR_CODE.PASSWORD_TOO_SHORT);
    }
  }

  async login(dto: LoginDTO, res: Response) {
    const { username, password } = dto;

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throwAppError(ERROR_CODE.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throwAppError(ERROR_CODE.ACCOUNT_DEACTIVATED);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');

    if (!isPasswordValid) {
      throwAppError(ERROR_CODE.INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role ?? Role.USER,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: ENV.JWT.SECRET,
      expiresIn: Number(ENV.JWT.EXPIRES),
    });

    const cookieName = ENV.JWT.COOKIE_NAME || 'jwt_token';

    res.cookie(cookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_EXPIRATION_TIME || '3600', 10) * 1000,
    });

    return {
      accessToken,
      cookieName,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role ?? Role.USER,
      },
    };
  }
}
