import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
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

  @ApiPropertyOptional({ enum: ['GENERAL_ICMS', 'ST_TRANSITION'], default: 'GENERAL_ICMS' })
  @IsString()
  @IsOptional()
  kind?: string;

  @ApiPropertyOptional({ description: 'ID da regra de transição ST (obrigatório se kind=ST_TRANSITION)' })
  @IsString()
  @IsOptional()
  transitionRuleId?: string;

  @ApiPropertyOptional({ description: 'Data de referência da transição' })
  @IsDateString()
  @IsOptional()
  transitionReferenceDate?: string;
}
