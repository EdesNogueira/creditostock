import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualLinkDto {
  @ApiProperty()
  @IsString()
  nfeItemId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
