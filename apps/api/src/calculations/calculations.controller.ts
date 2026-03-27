import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CalculationsService } from './calculations.service';
import { RunCalculationDto } from './dto/run-calculation.dto';

@ApiTags('calculations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calculations')
export class CalculationsController {
  constructor(private readonly service: CalculationsService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string) { return this.service.findAll(branchId); }

  @Get('dashboard')
  dashboard(@Query('branchId') branchId?: string) { return this.service.getDashboardStats(branchId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post('run')
  run(@Body() dto: RunCalculationDto) { return this.service.run(dto); }
}
