import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductAliasDto } from './dto/create-product-alias.dto';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('companyId') companyId?: string, @Query('search') search?: string) {
    return this.service.findAll(companyId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateProductDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) { return this.service.update(id, dto); }

  @Post(':id/aliases')
  createAlias(@Param('id') id: string, @Body() dto: CreateProductAliasDto) {
    return this.service.createAlias(id, dto);
  }

  @Delete('aliases/:aliasId')
  removeAlias(@Param('aliasId') aliasId: string) { return this.service.removeAlias(aliasId); }

  @Post('backfill')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reconstruir catálogo a partir de dados importados (estoque e NF-e)' })
  backfill() { return this.service.backfillFromImportedData(); }
}
