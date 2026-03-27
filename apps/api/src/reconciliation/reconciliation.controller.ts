import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReconciliationService } from './reconciliation.service';
import { ManualLinkDto } from './dto/manual-link.dto';

@ApiTags('reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  @Get()
  findAll(
    @Query('snapshotId') snapshotId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.service.findAll(snapshotId, page, limit);
  }

  @Get('stats/:snapshotId')
  getStats(@Param('snapshotId') snapshotId: string) {
    return this.service.getStats(snapshotId);
  }

  @Get(':stockItemId')
  findOne(@Param('stockItemId') id: string) { return this.service.findOne(id); }

  @Post(':stockItemId/manual-link')
  manualLink(
    @Param('stockItemId') id: string,
    @Body() dto: ManualLinkDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.manualLink(id, dto, user.userId);
  }

  @Post('run-matching/:snapshotId')
  runMatching(@Param('snapshotId') snapshotId: string) {
    return this.service.runMatching(snapshotId);
  }
}
