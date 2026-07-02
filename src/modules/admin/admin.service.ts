import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Analytics, User, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import { Role } from 'src/types/auth.type';
import {
  QueryAdminUsersDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
} from './dto';

export interface AdminUserSummary {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  isActive: boolean;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
  ) {}

  async getOverview() {
    const [totalUsers, totalWritings, totalAnalyses, adminCount] =
      await Promise.all([
        this.userRepository.count(),
        this.writingRepository.count(),
        this.analyticsRepository.count(),
        this.userRepository.count({ where: { role: Role.ADMIN } }),
      ]);

    return {
      totalUsers,
      totalWritings,
      totalAnalyses,
      adminCount,
    };
  }

  async findAllUsers(query: QueryAdminUsersDTO) {
    const { limit = 20, offset = 0, search, role, isActive } = query;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.is_active = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.full_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('user.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users.map((user) => this.toAdminUserSummary(user)),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      },
    };
  }

  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDTO,
    actorUserId: string,
  ): Promise<AdminUserSummary> {
    if (userId === actorUserId) {
      throwAppError(ERROR_CODE.CANNOT_MODIFY_OWN_ADMIN_ACCOUNT);
    }

    const user = await this.findUserById(userId);

    if (user.role === dto.role) {
      return this.toAdminUserSummary(user);
    }

    if (user.role === Role.ADMIN && dto.role === Role.USER) {
      await this.assertAnotherActiveAdminRemains(userId);
    }

    user.role = dto.role;
    const saved = await this.userRepository.save(user);
    return this.toAdminUserSummary(saved);
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDTO,
    actorUserId: string,
  ): Promise<AdminUserSummary> {
    if (userId === actorUserId && !dto.isActive) {
      throwAppError(ERROR_CODE.CANNOT_MODIFY_OWN_ADMIN_ACCOUNT);
    }

    const user = await this.findUserById(userId);

    if (user.isActive === dto.isActive) {
      return this.toAdminUserSummary(user);
    }

    if (user.role === Role.ADMIN && !dto.isActive) {
      await this.assertAnotherActiveAdminRemains(userId);
    }

    user.isActive = dto.isActive;
    const saved = await this.userRepository.save(user);
    return this.toAdminUserSummary(saved);
  }

  private async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throwAppError(ERROR_CODE.USER_NOT_FOUND);
    }

    return user;
  }

  private async assertAnotherActiveAdminRemains(excludeUserId: string) {
    const activeAdminCount = await this.userRepository.count({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });

    const excludedUser = await this.userRepository.findOne({
      where: { id: excludeUserId },
    });

    const contributesToAdminCount =
      excludedUser?.role === Role.ADMIN && excludedUser.isActive;

    if (contributesToAdminCount && activeAdminCount <= 1) {
      throwAppError(ERROR_CODE.LAST_ADMIN_REQUIRED);
    }
  }

  private toAdminUserSummary(user: User): AdminUserSummary {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      role: user.role as Role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
