/**
 * FIFO Allocation Logic Tests
 * 
 * Tests the core FIFO allocation algorithm in isolation.
 * The real implementation runs inside the worker, but the logic 
 * is testable with pure functions.
 */

interface MockNfeItem {
  id: string;
  cProd: string;
  qCom: number;
  vProd: number;
  vIcms: number;
  vICMSST: number;
  vFCPST: number;
  dataEmissao: Date;
}

interface MockStockItem {
  id: string;
  rawSku: string;
  quantity: number;
}

interface Allocation {
  stockItemId: string;
  nfeItemId: string;
  allocatedQty: number;
  allocatedCost: number;
  allocatedIcmsSt: number;
  allocatedFcpSt: number;
}

function runFifoAllocation(
  stockItems: MockStockItem[],
  nfeItems: MockNfeItem[],
): { allocations: Allocation[]; unmatched: string[] } {
  const sorted = [...nfeItems].sort((a, b) => a.dataEmissao.getTime() - b.dataEmissao.getTime());
  const usedQty = new Map<string, number>();
  const allocations: Allocation[] = [];
  const unmatched: string[] = [];

  const stripZeros = (s: string) => s.replace(/^0+/, '') || '0';

  for (const si of stockItems) {
    let remaining = si.quantity;
    const siSku = stripZeros(si.rawSku);

    const candidates = sorted.filter(ni => stripZeros(ni.cProd) === siSku);

    for (const ni of candidates) {
      if (remaining <= 0) break;
      const totalQty = ni.qCom;
      const used = usedQty.get(ni.id) ?? 0;
      const available = totalQty - used;
      if (available <= 0) continue;

      const allocQty = Math.min(remaining, available);
      const proportion = allocQty / totalQty;

      allocations.push({
        stockItemId: si.id,
        nfeItemId: ni.id,
        allocatedQty: allocQty,
        allocatedCost: ni.vProd * proportion,
        allocatedIcmsSt: ni.vICMSST * proportion,
        allocatedFcpSt: ni.vFCPST * proportion,
      });

      usedQty.set(ni.id, used + allocQty);
      remaining -= allocQty;
    }

    if (remaining > 0.0001) {
      unmatched.push(si.id);
    }
  }

  return { allocations, unmatched };
}

describe('FIFO Allocation', () => {
  it('deve alocar parcialmente quando estoque < NF', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '01314', quantity: 11 }];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '01314', qCom: 12, vProd: 206.45, vIcms: 24.77, vICMSST: 36.93, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations, unmatched } = runFifoAllocation(stock, nfe);
    expect(allocations.length).toBe(1);
    expect(allocations[0].allocatedQty).toBe(11);
    expect(allocations[0].allocatedCost).toBeCloseTo(206.45 * (11 / 12), 2);
    expect(allocations[0].allocatedIcmsSt).toBeCloseTo(36.93 * (11 / 12), 2);
    expect(unmatched.length).toBe(0);
  });

  it('deve impedir superalocação', () => {
    const stock: MockStockItem[] = [
      { id: 's1', rawSku: '01314', quantity: 8 },
      { id: 's2', rawSku: '01314', quantity: 6 },
    ];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '01314', qCom: 12, vProd: 206.45, vIcms: 24.77, vICMSST: 36.93, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations } = runFifoAllocation(stock, nfe);
    const totalAllocated = allocations.reduce((s, a) => s + a.allocatedQty, 0);
    expect(totalAllocated).toBe(12); // max is 12 (NF qty)
    expect(allocations[0].allocatedQty).toBe(8); // s1 gets 8
    expect(allocations[1].allocatedQty).toBe(4); // s2 gets remaining 4
  });

  it('deve consumir múltiplas NFs para um stock item', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '001', quantity: 20 }];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '001', qCom: 8, vProd: 100, vIcms: 10, vICMSST: 5, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
      { id: 'n2', cProd: '001', qCom: 15, vProd: 200, vIcms: 20, vICMSST: 10, vFCPST: 1, dataEmissao: new Date('2024-02-01') },
    ];

    const { allocations, unmatched } = runFifoAllocation(stock, nfe);
    expect(allocations.length).toBe(2);
    expect(allocations[0].allocatedQty).toBe(8); // n1 fully consumed
    expect(allocations[1].allocatedQty).toBe(12); // n2 partially consumed (12 of 15)
    expect(unmatched.length).toBe(0);
  });

  it('deve calcular valores proporcionais corretamente', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '001', quantity: 5 }];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '001', qCom: 10, vProd: 100, vIcms: 12, vICMSST: 20, vFCPST: 2, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations } = runFifoAllocation(stock, nfe);
    expect(allocations[0].allocatedQty).toBe(5);
    expect(allocations[0].allocatedCost).toBeCloseTo(50, 2); // 100 * 5/10
    expect(allocations[0].allocatedIcmsSt).toBeCloseTo(10, 2); // 20 * 5/10
    expect(allocations[0].allocatedFcpSt).toBeCloseTo(1, 2); // 2 * 5/10
  });

  it('deve respeitar FIFO (nota mais antiga primeiro)', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '001', quantity: 5 }];
    const nfe: MockNfeItem[] = [
      { id: 'n2', cProd: '001', qCom: 10, vProd: 200, vIcms: 0, vICMSST: 30, vFCPST: 0, dataEmissao: new Date('2024-06-01') },
      { id: 'n1', cProd: '001', qCom: 10, vProd: 100, vIcms: 0, vICMSST: 20, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations } = runFifoAllocation(stock, nfe);
    expect(allocations.length).toBe(1);
    expect(allocations[0].nfeItemId).toBe('n1'); // older note first
    expect(allocations[0].allocatedIcmsSt).toBeCloseTo(10, 2); // 20 * 5/10
  });

  it('deve gerar unmatched quando lastro insuficiente', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '001', quantity: 20 }];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '001', qCom: 5, vProd: 50, vIcms: 5, vICMSST: 3, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations, unmatched } = runFifoAllocation(stock, nfe);
    expect(allocations[0].allocatedQty).toBe(5);
    expect(unmatched).toContain('s1');
  });

  it('deve normalizar SKU com zeros à esquerda', () => {
    const stock: MockStockItem[] = [{ id: 's1', rawSku: '00000000001314', quantity: 5 }];
    const nfe: MockNfeItem[] = [
      { id: 'n1', cProd: '01314', qCom: 12, vProd: 100, vIcms: 10, vICMSST: 20, vFCPST: 0, dataEmissao: new Date('2024-01-01') },
    ];

    const { allocations } = runFifoAllocation(stock, nfe);
    expect(allocations.length).toBe(1);
    expect(allocations[0].allocatedQty).toBe(5);
  });
});
