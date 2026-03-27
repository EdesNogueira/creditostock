import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
  UseInterceptors, UploadedFile, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string) {
    return this.service.findAll(branchId);
  }

  @Get(':snapshotId/items')
  findItems(
    @Param('snapshotId') snapshotId: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.service.findItems(snapshotId, search, page, limit);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        branchId: { type: 'string' },
        referenceDate: { type: 'string', format: 'date' },
      },
    },
  })
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body('branchId') branchId: string,
    @Body('referenceDate') referenceDate: string,
  ) {
    return this.service.importStock(branchId, referenceDate, file);
  }
}
