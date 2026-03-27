import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDossierDto } from './dto/create-dossier.dto';

@Injectable()
export class DossiersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('dossiers') private readonly queue: Queue,
  ) {}

  async create(dto: CreateDossierDto, userId: string) {
    const dossier = await this.prisma.dossier.create({
      data: { branchId: dto.branchId, title: dto.title, notes: dto.notes, status: 'DRAFT' },
    });
    await this.queue.add('generate-dossier', { dossierId: dossier.id, userId });
    return dossier;
  }

  async findAll(branchId?: string) {
    return this.prisma.dossier.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const d = await this.prisma.dossier.findUnique({
      where: { id },
      include: { branch: { include: { company: true } } },
    });
    if (!d) throw new NotFoundException(`Dossier ${id} not found`);
    return d;
  }

  async approve(id: string, userId: string) {
    return this.prisma.dossier.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: userId },
    });
  }

  async reject(id: string) {
    return this.prisma.dossier.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
