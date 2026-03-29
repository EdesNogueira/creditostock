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
        stockSnapshotItem: { include: { product: true, issues: { select: { title: true, severity: true, status: true } } } },
        nfeItem: { include: { nfeDocument: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Load transition credit lots for this branch
    const creditLots = await this.prisma.transitionCreditLot.findMany({
      where: { branchId: branch.id },
    });
    const creditByAllocKey = new Map<string, { creditableAmount: number; status: string }>();
    for (const lot of creditLots) {
      const key = `${lot.stockSnapshotItemId}::${lot.nfeItemId}`;
      creditByAllocKey.set(key, {
        creditableAmount: parseFloat(String(lot.creditableAmount)),
        status: String(lot.status),
      });
    }

    const headers = [
      'SKU', 'Descrição', 'Qtd Origem (NF)', 'Qtd Aproveitada (Estoque)',
      'Custo Alocado (R$)', 'ICMS Regular (R$)', 'ICMS-ST (R$)', 'FCP-ST (R$)',
      'ICMS-ST Unit. (R$)', 'FCP-ST Unit. (R$)',
      'NF-e Chave', 'NF-e Número', 'NF-e Data Emissão', 'NF-e Emitente',
      'NCM', 'CEST', 'CFOP', 'CST', 'Alíquota ICMS (%)', 'Alíquota ICMS-ST (%)',
      'Regime Tributário', 'Crédito ST Calculado (R$)', 'Status do Crédito',
      'Pendências',
    ];

    const rows = allocations.map((a) => {
      const ni = a.nfeItem;
      const doc = ni?.nfeDocument;
      const si = a.stockSnapshotItem;
      const lotKey = `${a.stockSnapshotItemId}::${a.nfeItemId}`;
      const credit = creditByAllocKey.get(lotKey);
      const issues = si.issues.filter(i => i.status === 'OPEN').map(i => `[${i.severity}] ${i.title}`).join(' | ');

      return [
        si.rawSku,
        si.rawDescription,
        String(Number(ni?.qCom ?? 0).toFixed(4)),
        String(Number(a.allocatedQty).toFixed(4)),
        String(Number(a.allocatedCost).toFixed(2)),
        String(Number(a.allocatedRegularIcms).toFixed(2)),
        String(Number(a.allocatedIcmsSt).toFixed(2)),
        String(Number(a.allocatedFcpSt).toFixed(2)),
        String(Number(a.unitIcmsSt).toFixed(4)),
        String(Number(a.unitFcpSt).toFixed(4)),
        doc?.chaveAcesso ?? '',
        doc?.numero ?? '',
        doc?.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '',
        doc?.nomeEmitente ?? '',
        ni?.ncm ?? '',
        ni?.cest ?? '',
        ni?.cfop ?? '',
        ni?.cst ?? '',
        String(ni?.pIcms ?? ''),
        String(ni?.pICMSST ?? ''),
        String(a.sourceTaxRegime),
        credit ? String(credit.creditableAmount.toFixed(2)) : '',
        credit ? credit.status : '',
        issues || '',
      ];
    });

    const lines = [headers, ...rows];
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const filename = `dossie-${dossier.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${id.slice(0, 8)}.csv`;
    return { csv, filename };
  }

  async exportJson(id: string) {
    const dossier = await this.findOne(id);
    const branch = dossier.branch as { id: string; name: string; cnpj: string; company?: { name: string; cnpj: string } };

    const allocations = await this.prisma.stockOriginAllocation.findMany({
      where: { stockSnapshotItem: { snapshot: { branchId: branch.id } } },
      include: {
        stockSnapshotItem: { include: { issues: true } },
        nfeItem: { include: { nfeDocument: { select: { chaveAcesso: true, numero: true, serie: true, dataEmissao: true, nomeEmitente: true, cnpjEmitente: true, emitState: true, destState: true } } } },
        taxTransitionRule: { select: { name: true, calcMethod: true, stateFrom: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const creditLots = await this.prisma.transitionCreditLot.findMany({
      where: { branchId: branch.id },
      include: { ledgerEntries: { orderBy: { createdAt: 'asc' } } },
    });

    const balance = await this.prisma.transitionCreditLedgerEntry.groupBy({
      by: ['entryType'],
      where: { branchId: branch.id },
      _sum: { amount: true },
    });

    return {
      dossier: { id: dossier.id, title: dossier.title, status: dossier.status, createdAt: dossier.createdAt, approvedAt: dossier.approvedAt },
      branch: { name: branch.name, cnpj: branch.cnpj, company: branch.company },
      allocations: allocations.map(a => ({
        sku: a.stockSnapshotItem.rawSku,
        description: a.stockSnapshotItem.rawDescription,
        qtyOrigem: Number(a.nfeItem?.qCom ?? 0),
        qtyAproveitada: Number(a.allocatedQty),
        custoAlocado: Number(a.allocatedCost),
        icmsRegular: Number(a.allocatedRegularIcms),
        icmsSt: Number(a.allocatedIcmsSt),
        fcpSt: Number(a.allocatedFcpSt),
        unitIcmsSt: Number(a.unitIcmsSt),
        unitFcpSt: Number(a.unitFcpSt),
        regime: a.sourceTaxRegime,
        nfe: a.nfeItem?.nfeDocument ? {
          chave: a.nfeItem.nfeDocument.chaveAcesso,
          numero: a.nfeItem.nfeDocument.numero,
          data: a.nfeItem.nfeDocument.dataEmissao,
          emitente: a.nfeItem.nfeDocument.nomeEmitente,
          ufEmitente: a.nfeItem.nfeDocument.emitState,
        } : null,
        item: a.nfeItem ? { ncm: a.nfeItem.ncm, cest: a.nfeItem.cest, cfop: a.nfeItem.cfop, cst: a.nfeItem.cst, pIcmsSt: Number(a.nfeItem.pICMSST) } : null,
        issues: a.stockSnapshotItem.issues.filter(i => i.status === 'OPEN').map(i => ({ title: i.title, severity: i.severity })),
      })),
      creditLots: creditLots.map(l => ({
        id: l.id,
        sku: l.stockSnapshotItemId,
        creditableAmount: Number(l.creditableAmount),
        nonCreditableAmount: Number(l.nonCreditableAmount),
        totalIcmsSt: Number(l.totalIcmsSt),
        totalFcpSt: Number(l.totalFcpSt),
        status: l.status,
        rationale: l.rationale,
        ledger: l.ledgerEntries.map(e => ({ type: e.entryType, amount: Number(e.amount), notes: e.notes, date: e.createdAt })),
      })),
      balance: balance.map(b => ({ type: b.entryType, total: Number(b._sum.amount ?? 0) })),
    };
  }
}
