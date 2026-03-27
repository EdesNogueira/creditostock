import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { RunCalculationDto } from './dto/run-calculation.dto';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('calculations') private readonly queue: Queue,
  ) {}

  async run(dto: RunCalculationDto) {
    const calc = await this.prisma.creditCalculation.create({
      data: {
        branchId: dto.branchId,
        mode: dto.mode ?? 'ASSISTED',
        status: 'PENDING',
      },
    });
    await this.queue.add('run-calculation', { calculationId: calc.id, snapshotId: dto.snapshotId });
    return { calculationId: calc.id, message: 'Calculation job queued' };
  }

  async findAll(branchId?: string) {
    return this.prisma.creditCalculation.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true, cnpj: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.creditCalculation.findUnique({
      where: { id },
      include: { branch: true },
    });
  }

  async getDashboardStats(branchId?: string) {
    const where = branchId ? { branchId } : {};
    const latest = await this.prisma.creditCalculation.findFirst({
      where: { ...where, status: 'DONE' },
      orderBy: { finishedAt: 'desc' },
    });

    const stockTotal = await this.prisma.stockSnapshotItem.count({
      where: branchId
        ? { snapshot: { branchId } }
        : {},
    });

    const matched = await this.prisma.productMatch.count({
      where: { isConfirmed: true },
    });

    const nfeCount = await this.prisma.nfeDocument.count({ where });
    const issueCount = await this.prisma.issue.count({ where: { status: 'OPEN' } });

    return {
      totalStockSkus: stockTotal,
      reconciledPct: latest?.reconciledPct ?? 0,
      potentialCredit: Number(latest?.potentialCredit ?? 0),
      approvedCredit: Number(latest?.approvedCredit ?? 0),
      blockedCredit: Number(latest?.blockedCredit ?? 0),
      pendingItems: issueCount,
      importedXmlCount: nfeCount,
      confirmedMatches: matched,
    };
  }
}
