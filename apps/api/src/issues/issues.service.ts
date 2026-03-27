import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: string, severity?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [items, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        include: {
          stockSnapshotItem: {
            select: { rawSku: true, rawDescription: true, quantity: true },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.issue.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async update(id: string, dto: UpdateIssueDto) {
    return this.prisma.issue.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      },
    });
  }
}
