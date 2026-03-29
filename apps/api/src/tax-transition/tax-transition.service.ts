import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxTransitionRuleDto, UpdateTaxTransitionRuleDto } from './dto/tax-transition-rule.dto';

@Injectable()
export class TaxTransitionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(stateFrom?: string, isActive?: boolean) {
    return this.prisma.taxTransitionRule.findMany({
      where: {
        ...(stateFrom ? { stateFrom } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      orderBy: [{ stateFrom: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.taxTransitionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Regra de transição ${id} não encontrada`);
    return rule;
  }

  async create(dto: CreateTaxTransitionRuleDto) {
    return this.prisma.taxTransitionRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        stateFrom: dto.stateFrom,
        stateTo: dto.stateTo,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        ncmRange: dto.ncmRange,
        cestList: dto.cestList,
        cfopList: dto.cfopList,
        cstList: dto.cstList,
        calcMethod: (dto.calcMethod as 'PROPORTIONAL_ST_ONLY' | 'PROPORTIONAL_ST_PLUS_FCP' | 'MANUAL_OVERRIDE') ?? 'PROPORTIONAL_ST_ONLY',
        includeFcpStInCredit: dto.includeFcpStInCredit ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTaxTransitionRuleDto) {
    await this.findOne(id);
    return this.prisma.taxTransitionRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.stateFrom !== undefined && { stateFrom: dto.stateFrom }),
        ...(dto.stateTo !== undefined && { stateTo: dto.stateTo }),
        ...(dto.effectiveFrom !== undefined && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
        ...(dto.ncmRange !== undefined && { ncmRange: dto.ncmRange }),
        ...(dto.cestList !== undefined && { cestList: dto.cestList }),
        ...(dto.cfopList !== undefined && { cfopList: dto.cfopList }),
        ...(dto.cstList !== undefined && { cstList: dto.cstList }),
        ...(dto.calcMethod !== undefined && { calcMethod: dto.calcMethod as 'PROPORTIONAL_ST_ONLY' | 'PROPORTIONAL_ST_PLUS_FCP' | 'MANUAL_OVERRIDE' }),
        ...(dto.includeFcpStInCredit !== undefined && { includeFcpStInCredit: dto.includeFcpStInCredit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.taxTransitionRule.delete({ where: { id } });
  }
}
