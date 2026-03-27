import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { ManualLinkDto } from './dto/manual-link.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('matching') private readonly queue: Queue,
  ) {}

  async findAll(snapshotId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = snapshotId ? { snapshotId } : {};
    const [items, total] = await Promise.all([
      this.prisma.stockSnapshotItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          productMatches: { include: { nfeItem: { include: { nfeDocument: true } } } },
          originAllocations: true,
          _count: { select: { issues: true } },
        },
        orderBy: { rawDescription: 'asc' },
      }),
      this.prisma.stockSnapshotItem.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(stockItemId: string) {
    const item = await this.prisma.stockSnapshotItem.findUnique({
      where: { id: stockItemId },
      include: {
        product: { include: { aliases: true } },
        productMatches: {
          include: {
            nfeItem: { include: { nfeDocument: true } },
          },
        },
        originAllocations: { include: { nfeItem: { include: { nfeDocument: true } } } },
        issues: true,
      },
    });
    if (!item) throw new NotFoundException(`Stock item ${stockItemId} not found`);
    return item;
  }

  async manualLink(stockItemId: string, dto: ManualLinkDto, userId: string) {
    await this.findOne(stockItemId);
    const nfeItem = await this.prisma.nfeItem.findUnique({ where: { id: dto.nfeItemId } });
    if (!nfeItem) throw new NotFoundException(`NFe item ${dto.nfeItemId} not found`);

    return this.prisma.productMatch.create({
      data: {
        stockSnapshotItemId: stockItemId,
        nfeItemId: dto.nfeItemId,
        matchType: 'MANUAL',
        confidence: 1.0,
        isConfirmed: true,
        confirmedAt: new Date(),
        confirmedBy: userId,
        notes: dto.notes,
      },
    });
  }

  async runMatching(snapshotId: string) {
    const job = await this.queue.add('run-matching', { snapshotId });
    return { jobId: job.id, message: 'Matching job queued' };
  }

  async getStats(snapshotId: string) {
    const total = await this.prisma.stockSnapshotItem.count({ where: { snapshotId } });
    const matched = await this.prisma.stockSnapshotItem.count({
      where: { snapshotId, productMatches: { some: {} } },
    });
    const allocated = await this.prisma.stockSnapshotItem.count({
      where: { snapshotId, originAllocations: { some: {} } },
    });
    return {
      total,
      matched,
      unmatched: total - matched,
      allocated,
      reconciledPct: total > 0 ? Math.round((matched / total) * 100) : 0,
    };
  }
}
