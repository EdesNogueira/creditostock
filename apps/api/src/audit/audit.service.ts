import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    companyId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    payload?: unknown;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...params,
        payload: params.payload ? JSON.parse(JSON.stringify(params.payload)) : undefined,
      },
    });
  }

  async findAll(companyId?: string, entity?: string, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }
}
