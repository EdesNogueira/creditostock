import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CalcMethodDto {
  PROPORTIONAL_ST_ONLY = 'PROPORTIONAL_ST_ONLY',
  PROPORTIONAL_ST_PLUS_FCP = 'PROPORTIONAL_ST_PLUS_FCP',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

export class CreateTaxTransitionRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() stateFrom: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateTo?: string;
  @ApiProperty() @IsDateString() effectiveFrom: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ncmRange?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cestList?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cfopList?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cstList?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CalcMethodDto) calcMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeFcpStInCredit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateTaxTransitionRuleDto extends CreateTaxTransitionRuleDto {}
