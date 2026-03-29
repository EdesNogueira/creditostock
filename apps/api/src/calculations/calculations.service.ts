import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { RunCalculationDto } from './dto/run-calculation.dto';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('calculations') private readonly calcQueue: Queue,
    @InjectQueue('transition-calculations') private readonly transitionQueue: Queue,
  ) {}

  async run(dto: RunCalculationDto) {
    const kind = dto.kind ?? 'GENERAL_ICMS';

    if (kind === 'ST_TRANSITION') {
      if (!dto.transitionRuleId) throw new BadRequestException('transitionRuleId é obrigatório para cálculo de transição ST');
      if (!dto.branchId) throw new BadRequestException('branchId é obrigatório');

      const rule = await this.prisma.taxTransitionRule.findUnique({ where: { id: dto.transitionRuleId } });
      if (!rule) throw new BadRequestException('Regra de transição não encontrada');

      const calc = await this.prisma.creditCalculation.create({
        data: {
          branchId: dto.branchId,
          kind: 'ST_TRANSITION',
          mode: dto.mode ?? 'ASSISTED',
          status: 'PENDING',
          transitionRuleId: dto.transitionRuleId,
          transitionReferenceDate: dto.transitionReferenceDate ? new Date(dto.transitionReferenceDate) : undefined,
        },
      });

      await this.transitionQueue.add('run-transition-calculation', { calculationId: calc.id });
      return { calculationId: calc.id, kind: 'ST_TRANSITION', message: 'Cálculo de transição ST enfileirado' };
    }

    // Default: GENERAL_ICMS
    const calc = await this.prisma.creditCalculation.create({
      data: {
        branchId: dto.branchId,
        kind: 'GENERAL_ICMS',
        mode: dto.mode ?? 'ASSISTED',
        status: 'PENDING',
      },
    });
    await this.calcQueue.add('run-calculation', { calculationId: calc.id, snapshotId: dto.snapshotId });
    return { calculationId: calc.id, kind: 'GENERAL_ICMS', message: 'Cálculo enfileirado' };
  }

  async findAll(branchId?: string, kind?: string) {
    return this.prisma.creditCalculation.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(kind ? { kind: kind as 'GENERAL_ICMS' | 'ST_TRANSITION' } : {}),
      },
      include: {
        branch: { select: { name: true, cnpj: true } },
        transitionRule: { select: { name: true, calcMethod: true, stateFrom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.creditCalculation.findUnique({
      where: { id },
      include: {
        branch: true,
        transitionRule: true,
        transitionCreditLots: {
          include: {
            stockSnapshotItem: { select: { rawSku: true, rawDescription: true, quantity: true } },
            nfeItem: { select: { cProd: true, xProd: true, vICMSST: true, vFCPST: true } },
          },
          take: 100,
        },
      },
    });
  }

  async getDashboardStats(branchId?: string) {
    const where = branchId ? { branchId } : {};

    // Latest snapshot (most recent by referenceDate, status DONE)
    const latestSnapshot = await this.prisma.stockSnapshot.findFirst({
      where: { ...where, jobStatus: 'DONE' },
      orderBy: { referenceDate: 'desc' },
      select: { id: true, referenceDate: true, totalItems: true },
    });

    // Count distinct SKUs in latest snapshot
    let distinctSkus = 0;
    let totalStockItems = 0;
    let totalStockValue = 0;
    let matchedInSnapshot = 0;

    if (latestSnapshot) {
      // Count distinct SKUs using productId when available, normalized rawSku as fallback
      const items = await this.prisma.stockSnapshotItem.findMany({
        where: { snapshotId: latestSnapshot.id },
        select: { productId: true, rawSku: true },
      });
      const skuSet = new Set<string>();
      for (const item of items) {
        const key = item.productId ?? (item.rawSku.replace(/^0+/, '') || '0');
        skuSet.add(key);
      }
      distinctSkus = skuSet.size;

      const agg = await this.prisma.stockSnapshotItem.aggregate({
        where: { snapshotId: latestSnapshot.id },
        _count: true,
        _sum: { totalCost: true },
      });
      totalStockItems = agg._count;
      totalStockValue = Number(agg._sum.totalCost ?? 0);

      matchedInSnapshot = await this.prisma.productMatch.count({
        where: { isConfirmed: true, stockSnapshotItem: { snapshotId: latestSnapshot.id } },
      });
    }

    const latestGeneral = await this.prisma.creditCalculation.findFirst({
      where: { ...where, status: 'DONE', kind: 'GENERAL_ICMS' },
      orderBy: { finishedAt: 'desc' },
    });
    const latestTransition = await this.prisma.creditCalculation.findFirst({
      where: { ...where, status: 'DONE', kind: 'ST_TRANSITION' },
      orderBy: { finishedAt: 'desc' },
    });

    const nfeCount = await this.prisma.nfeDocument.count({ where });
    const issueCount = await this.prisma.issue.count({ where: { status: 'OPEN' } });

    const latest = latestTransition ?? latestGeneral;
    const reconciledPct = totalStockItems > 0 ? (matchedInSnapshot / totalStockItems) * 100 : (latest?.reconciledPct ?? 0);

    return {
      totalStockSkus: distinctSkus,
      totalStockItems,
      totalStockValue,
      reconciledPct,
      potentialCredit: Number(latest?.potentialCredit ?? 0),
      approvedCredit: Number(latest?.approvedCredit ?? 0),
      blockedCredit: Number(latest?.blockedCredit ?? 0),
      pendingItems: issueCount,
      importedXmlCount: nfeCount,
      confirmedMatches: matchedInSnapshot,
      latestSnapshotId: latestSnapshot?.id ?? null,
      latestSnapshotDate: latestSnapshot?.referenceDate ?? null,
      // ST Transition specific
      totalIcmsStCredit: Number(latestTransition?.totalIcmsStCredit ?? 0),
      totalFcpStCredit: Number(latestTransition?.totalFcpStCredit ?? 0),
      totalTransitionCreditGenerated: Number(latestTransition?.totalTransitionCreditGenerated ?? 0),
      totalTransitionCreditAvailable: Number(latestTransition?.totalTransitionCreditAvailable ?? 0),
    };
  }
}
