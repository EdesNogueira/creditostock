import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalculationMode } from '@prisma/client';

export class RunCalculationDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  snapshotId?: string;

  @ApiPropertyOptional({ enum: CalculationMode, default: CalculationMode.ASSISTED })
  @IsEnum(CalculationMode)
  @IsOptional()
  mode?: CalculationMode;
}
