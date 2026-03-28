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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    await parser.load();
    const result = await parser.getText();
    const fullText: string = result.pages.map((p: { text: string }) => p.text).join('\n');
    const lines: string[] = fullText
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('PDF não contém texto legível. Use um PDF com texto selecionável (não escaneado).');
    }

    const isRetaguardaFormat = lines.some(
      (l) =>
        l.includes('Posição de Estoque') ||
        l.includes('RetaguardaGB') ||
        (l.toLowerCase().includes('loja') &&
          l.toLowerCase().includes('produto') &&
          l.toLowerCase().includes('estoque')),
    );

    if (isRetaguardaFormat) {
      return this.parseRetaguardaPdf(lines);
    }

    return this.parseGenericPdf(lines);
  }

  private parseBrazilianNumber(s: string): number {
    return Number.parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }

  private parseRetaguardaPdf(lines: string[]): StockRowPreview[] {
    const UNITS = 'UND|UN|KG|G|MG|LT|L|ML|CX|RL|PC|PCT|PAR|PAC|FD|DZ|SC|TN|M|CM';
    const BR_NUM = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2,3})';

    const lineRegex = new RegExp(
      `^(\\d{4,8})\\s+(\\d{10,20})\\s+-\\s+(.+?)\\s+(${UNITS})\\s+` +
        `${BR_NUM}[\\s\\t]+${BR_NUM}[\\s\\t]+${BR_NUM}[\\s\\t]+${BR_NUM}[\\s\\t]+${BR_NUM}[\\s\\t]+${BR_NUM}\\s*$`,
      'i',
    );

    const rows: StockRowPreview[] = [];
    let rowNum = 0;

    for (const line of lines) {
      const match = line.match(lineRegex);
      if (!match) continue;

      rowNum++;
      const [, , productCode, description, unit, n0, n1, n2, n3, n4, n5] = match;

      const nums = [n0, n1, n2, n3, n4, n5].map((s) => this.parseBrazilianNumber(s));

      // pdf-parse extracts columns in this order for RetaguardaGB:
      // [0]=Estoque Inicial, [1]=Entrada, [2]=Estoque Final, [3]=Custo, [4]=Saída, [5]=Total
      let quantity = nums[2];
      let unitCost = nums[3];
      let totalCost = nums[5];

      // Cross-check: Total ≈ Quantity × UnitCost
      if (totalCost > 0 && Math.abs(quantity * unitCost - totalCost) > 0.1) {
        let found = false;
        for (let qi = 0; qi < 5 && !found; qi++) {
          for (let ci = qi + 1; ci < 5 && !found; ci++) {
            if (Math.abs(nums[qi] * nums[ci] - totalCost) < 0.1) {
              quantity = nums[qi];
              unitCost = nums[ci];
              found = true;
            }
          }
        }
      }

      const errors: string[] = [];
      if (!productCode) errors.push('SKU é obrigatório');
      if (!description.trim()) errors.push('Descrição é obrigatória');
      if (isNaN(quantity) || quantity < 0) errors.push('Quantidade inválida');
      if (isNaN(unitCost) || unitCost < 0) errors.push('Custo unitário inválido');

      rows.push({
        row: rowNum,
        sku: productCode,
        description: description.trim(),
        quantity: isNaN(quantity) ? 0 : quantity,
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        totalCost: isNaN(totalCost) ? 0 : totalCost,
        unit: unit.toUpperCase(),
        errors,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'Não foi possível extrair dados do PDF. Verifique se o arquivo tem formato de "Relatório Posição de Estoque".',
      );
    }

    return rows;
  }

  private parseGenericPdf(lines: string[]): StockRowPreview[] {
    const headerKeywords = ['sku', 'codigo', 'código', 'descricao', 'descrição', 'quantidade', 'qtd', 'custo'];
    let headerIdx = lines.findIndex((l) =>
      headerKeywords.some((k) => l.toLowerCase().includes(k)),
    );
    if (headerIdx < 0) headerIdx = 0;

    const headerLine = lines[headerIdx];
    const delimiter = headerLine.includes('\t')
      ? '\t'
      : headerLine.includes('|')
        ? '|'
        : headerLine.includes(';')
          ? ';'
          : /\s{2,}/;

    const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
    const dataLines = lines.slice(headerIdx + 1);

    const rows: StockRowPreview[] = [];
    let rowNum = headerIdx + 2;

    for (const line of dataLines) {
      if (!line || line.length < 3) {
        rowNum++;
        continue;
      }

      const cells = line.split(delimiter).map((c) => c.trim());
      if (cells.length < 2) {
        rowNum++;
        continue;
      }

      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (cells[i] !== undefined) row[h] = cells[i];
      });

      if (!row['sku'] && !row['codigo'] && !row['código'] && cells.length >= 2) {
        row['sku'] = cells[0];
        row['descricao'] = cells[1];
        if (cells[2]) row['quantidade'] = cells[2];
        if (cells[3]) row['custoUnitario'] = cells[3];
        if (cells[4]) row['ean'] = cells[4];
        if (cells[5]) row['ncm'] = cells[5];
      }

      const parsed = this.validateRow(row, rowNum);
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
