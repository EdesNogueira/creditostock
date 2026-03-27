import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax-rule.dto';

@Injectable()
export class TaxRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(state?: string) {
    return this.prisma.taxRule.findMany({
      where: state ? { state } : undefined,
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Tax rule ${id} not found`);
    return rule;
  }

  async create(dto: CreateTaxRuleDto) {
    return this.prisma.taxRule.create({
      data: {
        name: dto.name,
        state: dto.state,
        ncmRange: dto.ncmRange,
        cfopList: dto.cfopList,
        icmsRate: dto.icmsRate,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTaxRuleDto) {
    await this.findOne(id);
    return this.prisma.taxRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.ncmRange !== undefined && { ncmRange: dto.ncmRange }),
        ...(dto.cfopList !== undefined && { cfopList: dto.cfopList }),
        ...(dto.icmsRate !== undefined && { icmsRate: dto.icmsRate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.taxRule.delete({ where: { id } });
  }
}
