import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TaxTransitionService } from './tax-transition.service';
import { CreateTaxTransitionRuleDto, UpdateTaxTransitionRuleDto } from './dto/tax-transition-rule.dto';

@ApiTags('tax-transition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tax-transition')
export class TaxTransitionController {
  constructor(private readonly service: TaxTransitionService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Listar regras de transição ST' })
  findAll(@Query('stateFrom') stateFrom?: string, @Query('isActive') isActive?: string) {
    return this.service.findAll(stateFrom, isActive === 'true' ? true : isActive === 'false' ? false : undefined);
  }

  @Get('rules/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('rules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar regra de transição ST' })
  create(@Body() dto: CreateTaxTransitionRuleDto) {
    return this.service.create(dto);
  }

  @Put('rules/:id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTaxTransitionRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete('rules/:id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
