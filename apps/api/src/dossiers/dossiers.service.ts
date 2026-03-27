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

  async exportCsv(id: string) {
    const dossier = await this.findOne(id);
    const branch = dossier.branch as { id: string; name: string; cnpj: string };

    const allocations = await this.prisma.stockOriginAllocation.findMany({
      where: { stockSnapshotItem: { snapshot: { branchId: branch.id } } },
      include: {
        stockSnapshotItem: { include: { product: true } },
        nfeItem: { include: { nfeDocument: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const lines = [
      ['SKU', 'Descrição', 'Quantidade Alocada', 'Custo Alocado (R$)', 'ICMS Alocado (R$)', 'NF-e Chave', 'NF-e Número', 'NF-e Data Emissão', 'NCM', 'CFOP', 'CST', 'Alíquota ICMS (%)'],
      ...allocations.map((a) => [
        a.stockSnapshotItem.rawSku,
        a.stockSnapshotItem.rawDescription,
        String(Number(a.allocatedQty).toFixed(4)),
        String(Number(a.allocatedCost).toFixed(2)),
        String(Number(a.allocatedIcms).toFixed(2)),
        a.nfeItem?.nfeDocument?.chaveAcesso ?? '',
        a.nfeItem?.nfeDocument?.numero ?? '',
        a.nfeItem?.nfeDocument?.dataEmissao ? new Date(a.nfeItem.nfeDocument.dataEmissao).toLocaleDateString('pt-BR') : '',
        a.nfeItem?.ncm ?? '',
        a.nfeItem?.cfop ?? '',
        a.nfeItem?.cst ?? '',
        String(a.nfeItem?.pIcms ?? ''),
      ]),
    ];

    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const filename = `dossie-${dossier.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${id.slice(0, 8)}.csv`;
    return { csv, filename };
  }
}
