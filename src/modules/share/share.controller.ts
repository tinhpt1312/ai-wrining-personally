import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShareService } from './share.service';

@ApiTags('share')
@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get('writings/:id')
  findPublicWriting(@Param('id') id: string) {
    return this.shareService.findPublicWriting(id);
  }

  @Get('analysis/:id')
  findPublicAnalysis(@Param('id') id: string) {
    return this.shareService.findPublicAnalysis(id);
  }
}
