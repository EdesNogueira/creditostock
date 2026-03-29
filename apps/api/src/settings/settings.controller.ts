import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  async get(@CurrentUser() user: { companyId?: string }, @Query('companyId') queryCompanyId?: string) {
    const companyId = queryCompanyId ?? user?.companyId;
    if (!companyId) return {};
    return this.service.getForCompany(companyId);
  }

  @Put()
  @Roles('ADMIN')
  async update(@CurrentUser() user: { companyId?: string }, @Body() body: Record<string, unknown>) {
    const companyId = (body.companyId as string) ?? user?.companyId;
    if (!companyId) return {};
    const { companyId: _, ...data } = body;
    return this.service.update(companyId, data);
  }

  @Get('automation-runs')
  async getAutomationRuns(@CurrentUser() user: { companyId?: string }, @Query('limit') limit?: string) {
    const companyId = user?.companyId;
    if (!companyId) return [];
    return this.service.getAutomationRuns(companyId, limit ? parseInt(limit) : 20);
  }
}
