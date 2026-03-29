/**
 * Transition Credit Calculation Tests
 * 
 * Tests the ST transition credit calculation logic in isolation.
 */

interface AllocationWithST {
  allocatedQty: number;
  unitIcmsSt: number;
  unitFcpSt: number;
  sourceTaxRegime: 'ST' | 'NORMAL' | 'UNKNOWN';
  ncm: string;
  cfop: string;
  cst: string;
}

interface TransitionRule {
  calcMethod: 'PROPORTIONAL_ST_ONLY' | 'PROPORTIONAL_ST_PLUS_FCP' | 'MANUAL_OVERRIDE';
  includeFcpStInCredit: boolean;
  ncmRange?: string;
  cfopList?: string;
  cstList?: string;
}

interface CreditLot {
  creditableAmount: number;
  nonCreditableAmount: number;
  totalIcmsSt: number;
  totalFcpSt: number;
  status: 'OPEN' | 'BLOCKED';
}

function calculateTransitionCredit(alloc: AllocationWithST, rule: TransitionRule): CreditLot | null {
  if (alloc.sourceTaxRegime !== 'ST') return null;

  // Rule filters
  if (rule.ncmRange) {
    const [from, to] = rule.ncmRange.split('-').map(s => s.trim());
    if (alloc.ncm < from || (to && alloc.ncm > to)) return null;
  }
  if (rule.cfopList) {
    const cfops = rule.cfopList.split(',').map(s => s.trim());
    if (!cfops.includes(alloc.cfop)) return null;
  }
  if (rule.cstList) {
    const csts = rule.cstList.split(',').map(s => s.trim());
    if (!csts.includes(alloc.cst)) return null;
  }

  const totalSt = alloc.allocatedQty * alloc.unitIcmsSt;
  const totalFcp = alloc.allocatedQty * alloc.unitFcpSt;

  let creditableAmount: number;
  let nonCreditableAmount: number;

  switch (rule.calcMethod) {
    case 'PROPORTIONAL_ST_ONLY':
      creditableAmount = totalSt;
      nonCreditableAmount = totalFcp;
      break;
    case 'PROPORTIONAL_ST_PLUS_FCP':
      creditableAmount = totalSt + totalFcp;
      nonCreditableAmount = 0;
      break;
    case 'MANUAL_OVERRIDE':
      creditableAmount = 0;
      nonCreditableAmount = totalSt + totalFcp;
      break;
  }

  return {
    creditableAmount,
    nonCreditableAmount,
    totalIcmsSt: totalSt,
    totalFcpSt: totalFcp,
    status: creditableAmount > 0 ? 'OPEN' : 'BLOCKED',
  };
}

describe('Transition Credit Calculation', () => {
  const baseAlloc: AllocationWithST = {
    allocatedQty: 11,
    unitIcmsSt: 3.0775, // 36.93 / 12
    unitFcpSt: 0,
    sourceTaxRegime: 'ST',
    ncm: '33072010',
    cfop: '6403',
    cst: '10',
  };

  describe('PROPORTIONAL_ST_ONLY', () => {
    const rule: TransitionRule = {
      calcMethod: 'PROPORTIONAL_ST_ONLY',
      includeFcpStInCredit: false,
    };

    it('deve gerar crédito proporcional de ICMS-ST', () => {
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).not.toBeNull();
      expect(lot!.creditableAmount).toBeCloseTo(11 * 3.0775, 2);
      expect(lot!.totalIcmsSt).toBeCloseTo(33.85, 2);
      expect(lot!.status).toBe('OPEN');
    });

    it('deve separar FCP-ST como não creditável', () => {
      const allocWithFcp = { ...baseAlloc, unitFcpSt: 0.61, allocatedQty: 1 };
      const lot = calculateTransitionCredit(allocWithFcp, rule);
      expect(lot!.creditableAmount).toBeCloseTo(3.0775, 2);
      expect(lot!.nonCreditableAmount).toBeCloseTo(0.61, 2);
    });
  });

  describe('PROPORTIONAL_ST_PLUS_FCP', () => {
    const rule: TransitionRule = {
      calcMethod: 'PROPORTIONAL_ST_PLUS_FCP',
      includeFcpStInCredit: true,
    };

    it('deve incluir FCP-ST no crédito', () => {
      const allocWithFcp = { ...baseAlloc, unitFcpSt: 0.61, allocatedQty: 1 };
      const lot = calculateTransitionCredit(allocWithFcp, rule);
      expect(lot!.creditableAmount).toBeCloseTo(3.0775 + 0.61, 2);
      expect(lot!.nonCreditableAmount).toBe(0);
    });
  });

  describe('MANUAL_OVERRIDE', () => {
    const rule: TransitionRule = {
      calcMethod: 'MANUAL_OVERRIDE',
      includeFcpStInCredit: false,
    };

    it('deve gerar crédito zero e marcar como BLOCKED', () => {
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot!.creditableAmount).toBe(0);
      expect(lot!.status).toBe('BLOCKED');
      expect(lot!.nonCreditableAmount).toBeCloseTo(11 * 3.0775, 2);
    });
  });

  describe('Filtros da regra', () => {
    it('deve excluir item fora da faixa NCM', () => {
      const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false, ncmRange: '84710000-84739999' };
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).toBeNull();
    });

    it('deve aceitar item dentro da faixa NCM', () => {
      const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false, ncmRange: '33000000-33999999' };
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).not.toBeNull();
    });

    it('deve excluir item com CFOP fora da lista', () => {
      const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false, cfopList: '5102,1403' };
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).toBeNull();
    });

    it('deve aceitar item com CFOP na lista', () => {
      const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false, cfopList: '6403,5102' };
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).not.toBeNull();
    });

    it('deve excluir item com CST fora da lista', () => {
      const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false, cstList: '00,20' };
      const lot = calculateTransitionCredit(baseAlloc, rule);
      expect(lot).toBeNull();
    });
  });

  it('deve rejeitar alocação que não é ST', () => {
    const allocNormal = { ...baseAlloc, sourceTaxRegime: 'NORMAL' as const };
    const rule: TransitionRule = { calcMethod: 'PROPORTIONAL_ST_ONLY', includeFcpStInCredit: false };
    const lot = calculateTransitionCredit(allocNormal, rule);
    expect(lot).toBeNull();
  });
});
