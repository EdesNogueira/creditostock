import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as XLSX from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

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
    const isPdf = file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';
    const preview = isPdf
      ? await this.parsePdf(file.buffer)
      : this.parseFile(file.buffer, file.originalname);
    const errors = preview.filter((r) => r.errors.length > 0);
    if (errors.length > 0 && errors.length === preview.length) {
      throw new BadRequestException({ message: 'All rows have validation errors', errors });
    }

    // Storage upload is optional
    let storageKey: string | undefined;
    try {
      storageKey = this.storage.buildKey('stock', file.originalname);
      await this.storage.upload(storageKey, file.buffer, file.mimetype);
    } catch {
      storageKey = undefined;
    }

    const snapshot = await this.prisma.stockSnapshot.create({
      data: {
        branchId,
        referenceDate: new Date(referenceDate),
        fileName: file.originalname,
        ...(storageKey ? { storageKey } : {}),
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
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) {
      throw new BadRequestException('PDF requer processamento assíncrono — use parsePdf()');
    }
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return rows.map((row, i) => this.validateRow(row, i + 2));
  }

  async parsePdf(buffer: Buffer): Promise<StockRowPreview[]> {
    const data = await pdfParse(buffer);
    const lines = data.text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('PDF não contém texto legível. Use um PDF com texto selecionável (não escaneado).');
    }

    // Detect header row: first line containing column-like keywords
    const headerKeywords = ['sku', 'codigo', 'código', 'descricao', 'descrição', 'quantidade', 'qtd', 'custo'];
    let headerIdx = lines.findIndex((l) =>
      headerKeywords.some((k) => l.toLowerCase().includes(k)),
    );
    if (headerIdx < 0) headerIdx = 0;

    const headerLine = lines[headerIdx];
    // Split header by common delimiters (tab, multiple spaces, | or ;)
    const delimiter = headerLine.includes('\t') ? '\t'
      : headerLine.includes('|') ? '|'
      : headerLine.includes(';') ? ';'
      : /\s{2,}/;

    const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
    const dataLines = lines.slice(headerIdx + 1);

    const rows: StockRowPreview[] = [];
    let rowNum = headerIdx + 2;

    for (const line of dataLines) {
      if (!line || line.length < 3) { rowNum++; continue; }

      const cells = line.split(delimiter).map((c) => c.trim());
      if (cells.length < 2) { rowNum++; continue; }

      // Build row object mapping headers to cells
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { if (cells[i] !== undefined) row[h] = cells[i]; });

      // If no headers matched, try positional: col0=sku, col1=description, col2=qty, col3=unitCost
      if (!row['sku'] && !row['codigo'] && !row['código'] && cells.length >= 2) {
        row['sku'] = cells[0];
        row['descricao'] = cells[1];
        if (cells[2]) row['quantidade'] = cells[2];
        if (cells[3]) row['custoUnitario'] = cells[3];
        if (cells[4]) row['ean'] = cells[4];
        if (cells[5]) row['ncm'] = cells[5];
      }

      const parsed = this.validateRow(row, rowNum);
      // Skip lines that look like page headers/footers (all errors AND very short sku)
      if (parsed.errors.length === 0 || parsed.sku.length > 0) {
        rows.push(parsed);
      }
      rowNum++;
    }

    if (rows.filter((r) => r.errors.length === 0).length === 0) {
      throw new BadRequestException(
        'Não foi possível extrair dados do PDF. Verifique se o arquivo tem formato tabular com colunas de SKU, descrição, quantidade e custo.',
      );
    }

    return rows;
  }

  private validateRow(row: Record<string, unknown>, rowNum: number): StockRowPreview {
    const errors: string[] = [];
    const sku = String(row['sku'] ?? row['SKU'] ?? row['codigo'] ?? row['Codigo'] ?? '').trim();
    const description = String(row['description'] ?? row['descricao'] ?? row['Descricao'] ?? row['DESCRICAO'] ?? row['descricão'] ?? '').trim();
    const qty = parseFloat(String(row['quantity'] ?? row['quantidade'] ?? row['Quantidade'] ?? row['QTD'] ?? row['qtd'] ?? '0'));
    const unitCost = parseFloat(String(row['unitCost'] ?? row['custoUnitario'] ?? row['custo_unitario'] ?? row['custounitario'] ?? row['Custo Unitario'] ?? row['CUSTO_UNIT'] ?? '0'));

    if (!sku) errors.push('SKU é obrigatório');
    if (!description) errors.push('Descrição é obrigatória');
    if (isNaN(qty) || qty < 0) errors.push('Quantidade inválida');
    if (isNaN(unitCost) || unitCost < 0) errors.push('Custo unitário inválido');

    return {
      row: rowNum,
      sku,
      ean: String(row['ean'] ?? row['EAN'] ?? '').trim() || undefined,
      description,
      ncm: String(row['ncm'] ?? row['NCM'] ?? '').trim() || undefined,
      quantity: isNaN(qty) ? 0 : qty,
      unitCost: isNaN(unitCost) ? 0 : unitCost,
      totalCost: isNaN(qty) || isNaN(unitCost) ? 0 : qty * unitCost,
      unit: String(row['unit'] ?? row['unidade'] ?? row['Unidade'] ?? 'UN').trim(),
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
