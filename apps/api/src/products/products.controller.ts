import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @Post(':id/aliases')
  createAlias(@Param('id') id: string, @Body() dto: CreateProductAliasDto) {
    return this.service.createAlias(id, dto);
  }

  @Delete('aliases/:aliasId')
  removeAlias(@Param('aliasId') aliasId: string) { return this.service.removeAlias(aliasId); }
}
