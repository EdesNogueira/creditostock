import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TaxRulesService } from './tax-rules.service';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax-rule.dto';

@ApiTags('tax-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-rules')
export class TaxRulesController {
  constructor(private readonly service: TaxRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List all tax rules' })
  findAll(@Query('state') state?: string) {
    return this.service.findAll(state);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tax rule' })
  create(@Body() dto: CreateTaxRuleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
