import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, StreamableFile, Header } from '@nestjs/common';
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

  @Get(':id/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Param('id') id: string) {
    const { csv, filename } = await this.service.exportCsv(id);
    const buffer = Buffer.from('\uFEFF' + csv, 'utf-8');
    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get(':id/export-json')
  async exportJson(@Param('id') id: string) {
    return this.service.exportJson(id);
  }
}
