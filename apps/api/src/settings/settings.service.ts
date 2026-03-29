import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForCompany(companyId: string) {
    let settings = await this.prisma.systemSettings.findUnique({ where: { companyId } });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({ data: { companyId } });
    }
    return settings;
  }

  async update(companyId: string, data: Record<string, unknown>) {
    const existing = await this.getForCompany(companyId);
    return this.prisma.systemSettings.update({
      where: { id: existing.id },
      data: data as any,
    });
  }

  async getAutomationRuns(companyId: string, limit = 20) {
    return this.prisma.automationRun.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
