import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) { return this.service.findAll(companyId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateUserDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('me/onboarding')
  getOnboarding(@CurrentUser() user: { userId: string }) {
    return this.service.getOnboardingStatus(user.userId);
  }

  @Put('me/onboarding/dismiss')
  dismissOnboarding(@CurrentUser() user: { userId: string }) {
    return this.service.dismissOnboarding(user.userId);
  }

  @Put('me/onboarding/reset')
  resetOnboarding(@CurrentUser() user: { userId: string }) {
    return this.service.resetOnboarding(user.userId);
  }
}
