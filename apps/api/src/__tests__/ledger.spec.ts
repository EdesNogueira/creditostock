/**
 * Ledger Balance Calculation Tests
 */

interface LedgerEntry {
  entryType: 'GENERATED' | 'MANUAL_ADJUSTMENT' | 'USED' | 'BLOCKED' | 'REVERSED';
  amount: number;
}

function calculateBalance(entries: LedgerEntry[]) {
  let generated = 0;
  let used = 0;
  let blocked = 0;
  let adjustments = 0;
  let reversed = 0;

  for (const entry of entries) {
    switch (entry.entryType) {
      case 'GENERATED': generated += entry.amount; break;
      case 'USED': used += entry.amount; break;
      case 'BLOCKED': blocked += entry.amount; break;
      case 'MANUAL_ADJUSTMENT': adjustments += entry.amount; break;
      case 'REVERSED': reversed += entry.amount; break;
    }
  }

  const available = generated + adjustments + used + blocked + reversed;

  return {
    totalGenerated: generated,
    totalUsed: Math.abs(used),
    totalBlocked: Math.abs(blocked),
    totalAdjustments: adjustments,
    totalReversed: Math.abs(reversed),
    available: Math.max(0, available),
  };
}

describe('Ledger Balance', () => {
  it('deve registrar geração corretamente', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 100 },
      { entryType: 'GENERATED', amount: 50 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalGenerated).toBe(150);
    expect(balance.available).toBe(150);
  });

  it('deve registrar uso e reduzir saldo', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 100 },
      { entryType: 'USED', amount: -30 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalGenerated).toBe(100);
    expect(balance.totalUsed).toBe(30);
    expect(balance.available).toBe(70);
  });

  it('deve registrar bloqueio', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 100 },
      { entryType: 'BLOCKED', amount: -40 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalBlocked).toBe(40);
    expect(balance.available).toBe(60);
  });

  it('deve registrar ajuste manual', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 100 },
      { entryType: 'MANUAL_ADJUSTMENT', amount: 20 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalAdjustments).toBe(20);
    expect(balance.available).toBe(120);
  });

  it('deve registrar estorno e recalcular', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 100 },
      { entryType: 'BLOCKED', amount: -40 },
      { entryType: 'REVERSED', amount: -20 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalReversed).toBe(20);
    expect(balance.available).toBe(40); // 100 - 40 - 20
  });

  it('deve impedir saldo negativo', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 50 },
      { entryType: 'USED', amount: -80 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.available).toBe(0); // Math.max(0, -30)
  });

  it('deve funcionar com cenário complexo', () => {
    const entries: LedgerEntry[] = [
      { entryType: 'GENERATED', amount: 1000 },
      { entryType: 'GENERATED', amount: 500 },
      { entryType: 'USED', amount: -200 },
      { entryType: 'BLOCKED', amount: -300 },
      { entryType: 'MANUAL_ADJUSTMENT', amount: 50 },
      { entryType: 'REVERSED', amount: -100 },
    ];
    const balance = calculateBalance(entries);
    expect(balance.totalGenerated).toBe(1500);
    expect(balance.totalUsed).toBe(200);
    expect(balance.totalBlocked).toBe(300);
    expect(balance.totalAdjustments).toBe(50);
    expect(balance.totalReversed).toBe(100);
    expect(balance.available).toBe(950); // 1500 + 50 - 200 - 300 - 100
  });
});
