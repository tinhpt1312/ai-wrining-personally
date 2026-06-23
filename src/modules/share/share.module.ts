import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analytics, Writing } from 'src/entities';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

@Module({
  imports: [TypeOrmModule.forFeature([Writing, Analytics])],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
