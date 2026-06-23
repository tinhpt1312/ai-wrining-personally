import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { ENV } from 'src/config';
import { User } from 'src/entities';
import { Repository } from 'typeorm';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Role } from 'src/common/enums/role.enum';
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
        throw new ConflictException('Tên đăng nhập đã tồn tại');
      }
      throw new ConflictException('Email đã được sử dụng');
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
      throw new BadRequestException('Vui lòng nhập email');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    return normalized;
  }

  private validatePassword(password?: string): void {
    if (!password) {
      throw new BadRequestException('Vui lòng nhập mật khẩu');
    }

    if (password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }
  }

  async login(dto: LoginDTO, res: Response) {
    const { username, password } = dto;

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');

    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
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
