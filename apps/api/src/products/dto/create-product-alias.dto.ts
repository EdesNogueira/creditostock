import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductAliasDto {
  @ApiProperty({ example: 'sku' })
  @IsString()
  aliasType: string;

  @ApiProperty()
  @IsString()
  aliasValue: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceNote?: string;
}
