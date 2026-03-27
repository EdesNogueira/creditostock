import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as XLSX from 'xlsx';

export interface StockRowPreview {
  row: number;
  sku: string;
  ean?: string;
  description: string;
  ncm?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  errors: string[];
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('stock-import') private readonly queue: Queue,
  ) {}

  async importStock(
    branchId: string,
    referenceDate: string,
    file: Express.Multer.File,
  ) {
    const preview = this.parseFile(file.buffer, file.originalname);
    const errors = preview.filter((r) => r.errors.length > 0);
    if (errors.length > 0 && errors.length === preview.length) {
      throw new BadRequestException({ message: 'All rows have validation errors', errors });
    }

    const storageKey = this.storage.buildKey('stock', file.originalname);
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    const snapshot = await this.prisma.stockSnapshot.create({
      data: {
        branchId,
        referenceDate: new Date(referenceDate),
        fileName: file.originalname,
        storageKey,
        totalItems: preview.length,
        jobStatus: 'QUEUED',
      },
    });

    await this.queue.add('process-stock-import', {
      snapshotId: snapshot.id,
      rows: preview.filter((r) => r.errors.length === 0),
    });

    return { snapshotId: snapshot.id, total: preview.length, errorRows: errors.length, preview: preview.slice(0, 10) };
  }

  parseFile(buffer: Buffer, filename: string): StockRowPreview[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return rows.map((row, i) => this.validateRow(row, i + 2));
  }

  private validateRow(row: Record<string, unknown>, rowNum: number): StockRowPreview {
    const errors: string[] = [];
    const sku = String(row['sku'] ?? row['SKU'] ?? row['codigo'] ?? '').trim();
    const description = String(row['description'] ?? row['descricao'] ?? row['DESCRICAO'] ?? '').trim();
    const qty = parseFloat(String(row['quantity'] ?? row['quantidade'] ?? row['QTD'] ?? '0'));
    const unitCost = parseFloat(String(row['unitCost'] ?? row['custo_unitario'] ?? row['CUSTO_UNIT'] ?? '0'));

    if (!sku) errors.push('SKU is required');
    if (!description) errors.push('Description is required');
    if (isNaN(qty) || qty < 0) errors.push('Invalid quantity');
    if (isNaN(unitCost) || unitCost < 0) errors.push('Invalid unit cost');

    return {
      row: rowNum,
      sku,
      ean: String(row['ean'] ?? row['EAN'] ?? '').trim() || undefined,
      description,
      ncm: String(row['ncm'] ?? row['NCM'] ?? '').trim() || undefined,
      quantity: isNaN(qty) ? 0 : qty,
      unitCost: isNaN(unitCost) ? 0 : unitCost,
      totalCost: isNaN(qty) || isNaN(unitCost) ? 0 : qty * unitCost,
      unit: String(row['unit'] ?? row['unidade'] ?? 'UN').trim(),
      errors,
    };
  }

  async findAll(branchId?: string) {
    return this.prisma.stockSnapshot.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { importedAt: 'desc' },
    });
  }

  async findItems(snapshotId: string, search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = {
      snapshotId,
      ...(search
        ? {
            OR: [
              { rawSku: { contains: search, mode: 'insensitive' as const } },
              { rawDescription: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.stockSnapshotItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          _count: { select: { productMatches: true, originAllocations: true } },
        },
      }),
      this.prisma.stockSnapshotItem.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
