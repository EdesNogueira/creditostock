import * as fs from 'fs';
import * as path from 'path';
import { StockService } from '../stock/stock.service';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../fixtures/estoque-retaguarda.pdf');

describe('PDF Estoque Parser', () => {
  let service: StockService;
  let pdfBuffer: Buffer;

  beforeAll(() => {
    // Create a minimal mock for StockService dependencies
    service = new (StockService as any)(null, null, null);
    if (fs.existsSync(FIXTURE_PATH)) {
      pdfBuffer = fs.readFileSync(FIXTURE_PATH);
    }
  });

  it('deve ter o fixture PDF disponível', () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);
  });

  it('deve parsear o PDF sem erro', async () => {
    if (!pdfBuffer) return;
    const rows = await service.parsePdf(pdfBuffer);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('deve extrair pelo menos 20 itens do PDF', async () => {
    if (!pdfBuffer) return;
    const rows = await service.parsePdf(pdfBuffer);
    expect(rows.length).toBeGreaterThanOrEqual(20);
  });

  it('deve reconhecer o SKU 01314 (PMPCK ZAAD)', async () => {
    if (!pdfBuffer) return;
    const rows = await service.parsePdf(pdfBuffer);
    const item = rows.find(r =>
      r.sku.includes('1314') || r.description.toLowerCase().includes('zaad'),
    );
    expect(item).toBeDefined();
    if (item) {
      expect(item.sku).toContain('1314');
    }
  });

  it('deve extrair quantidades positivas', async () => {
    if (!pdfBuffer) return;
    const rows = await service.parsePdf(pdfBuffer);
    const validRows = rows.filter(r => r.errors.length === 0);
    expect(validRows.length).toBeGreaterThan(0);
    for (const row of validRows) {
      expect(row.quantity).toBeGreaterThanOrEqual(0);
    }
  });

  it('deve extrair custos positivos', async () => {
    if (!pdfBuffer) return;
    const rows = await service.parsePdf(pdfBuffer);
    const validRows = rows.filter(r => r.errors.length === 0 && r.unitCost > 0);
    expect(validRows.length).toBeGreaterThan(0);
  });
});
