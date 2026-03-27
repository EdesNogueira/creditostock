import { Controller, Get, Put, Param, Query, Body, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IssuesService } from './issues.service';
import { UpdateIssueDto } from './dto/update-issue.dto';

@ApiTags('issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.service.findAll(status, severity, page, limit);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    return this.service.update(id, dto);
  }
}
