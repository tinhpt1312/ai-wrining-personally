import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Analytics, User, Writing } from 'src/entities';
import { Repository } from 'typeorm';
import { Role } from 'src/common/enums/role.enum';

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
}
