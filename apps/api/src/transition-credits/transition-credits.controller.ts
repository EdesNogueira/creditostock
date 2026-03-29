import { Controller, Get, Post, Param, Query, Body, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransitionCreditsService } from './transition-credits.service';

@ApiTags('transition-credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TransitionCreditsController {
  constructor(private readonly service: TransitionCreditsService) {}

  @Get('transition-credits')
  @ApiOperation({ summary: 'Listar lotes de crédito de transição ST' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('calculationId') calculationId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.service.findAll(branchId, status, calculationId, page, limit);
  }

  @Get('transition-credits/balance/:branchId')
  @ApiOperation({ summary: 'Saldo de crédito de transição por filial' })
  getBalance(@Param('branchId') branchId: string) {
    return this.service.getBalance(branchId);
  }

  @Get('transition-credits/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('transition-credits/:id/adjust')
  @ApiOperation({ summary: 'Ajuste manual de crédito' })
  adjustCredit(
    @Param('id') id: string,
    @Body() body: { amount: number; notes: string },
  ) {
    return this.service.adjustCredit(id, body.amount, body.notes);
  }

  @Post('transition-credits/:id/block')
  @ApiOperation({ summary: 'Bloquear lote de crédito' })
  blockCredit(
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    return this.service.blockCredit(id, body.notes);
  }

  @Get('transition-ledger')
  @ApiOperation({ summary: 'Extrato do ledger de créditos de transição' })
  getLedger(
    @Query('branchId') branchId?: string,
    @Query('lotId') lotId?: string,
    @Query('entryType') entryType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    return this.service.getLedger(branchId, lotId, entryType, page, limit);
  }
}
