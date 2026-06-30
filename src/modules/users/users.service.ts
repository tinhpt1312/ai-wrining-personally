import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ERROR_CODE, SUCCESS_MESSAGES } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { User, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import { WritingStatusEnum } from '../writings/enum';
import { ChangePasswordDTO, UpdateProfileDTO } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
  ) {}

  async getMe(userId: string) {
    const user = await this.findUserById(userId);
    return this.toSafeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDTO) {
    const user = await this.findUserById(userId);

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (existing) {
        throwAppError(ERROR_CODE.USERNAME_EXISTS);
      }
      user.username = dto.username;
    }

    if (dto.email && dto.email !== user.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throwAppError(ERROR_CODE.EMAIL_ALREADY_USED);
      }
      user.email = normalizedEmail;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim() || undefined;
    }

    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      throwAppError(ERROR_CODE.CANNOT_CHANGE_PASSWORD);
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throwAppError(ERROR_CODE.CURRENT_PASSWORD_WRONG);
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: SUCCESS_MESSAGES.passwordChanged };
  }

  async getPublicProfile(username: string) {
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
      select: {
        id: true,
        username: true,
        fullName: true,
        createdAt: true,
      },
    });

    if (!user) {
      throwAppError(ERROR_CODE.USER_NOT_FOUND);
    }

    const publicWritingsCount = await this.writingRepository.count({
      where: {
        userId: user.id,
        status: WritingStatusEnum.PUBLIC,
      },
    });

    return {
      username: user.username,
      fullName: user.fullName,
      createdAt: user.createdAt,
      publicWritingsCount,
    };
  }

  private async findUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throwAppError(ERROR_CODE.USER_NOT_FOUND);
    }

    return user;
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
