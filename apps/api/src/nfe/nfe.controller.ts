import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
  UseInterceptors, UploadedFiles, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NfeService } from './nfe.service';

@ApiTags('nfe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nfe')
export class NfeController {
  constructor(private readonly service: NfeService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.service.findAll(branchId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post('import-xml')
  @UseInterceptors(FilesInterceptor('files', 100))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        branchId: { type: 'string' },
      },
    },
  })
  importXmls(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('branchId') branchId: string,
  ) {
    return this.service.importXmls(branchId, files);
  }
}
