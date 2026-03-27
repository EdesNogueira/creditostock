import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IssueStatus } from '@prisma/client';

export class UpdateIssueDto {
  @ApiPropertyOptional({ enum: IssueStatus })
  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resolution?: string;
}
