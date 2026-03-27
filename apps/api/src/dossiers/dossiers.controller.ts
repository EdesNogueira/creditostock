import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DossiersService } from './dossiers.service';
import { CreateDossierDto } from './dto/create-dossier.dto';

@ApiTags('dossiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dossiers')
export class DossiersController {
  constructor(private readonly service: DossiersService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string) { return this.service.findAll(branchId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateDossierDto, @CurrentUser() user: { userId: string }) {
    return this.service.create(dto, user.userId);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.approve(id, user.userId);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string) { return this.service.reject(id); }
}
