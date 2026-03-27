import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ncmRange?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() cfopList?: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) icmsRate: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateTaxRuleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() state?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ncmRange?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() cfopList?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) @Max(100) icmsRate?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
