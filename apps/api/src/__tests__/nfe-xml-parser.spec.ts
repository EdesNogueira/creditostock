import * as fs from 'fs';
import * as path from 'path';
import { parseNfeXml, getParserVersion } from '../nfe/parser/nfe-xml-parser';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../fixtures/sample-nfe-real.xml');

describe('NF-e XML Parser', () => {
  let xmlString: string;
  let result: ReturnType<typeof parseNfeXml>;

  beforeAll(() => {
    xmlString = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    result = parseNfeXml(xmlString);
  });

  it('deve retornar uma versão de parser', () => {
    expect(getParserVersion()).toBeDefined();
    expect(result.header.parserVersion).toBe(getParserVersion());
  });

  it('deve gerar hash SHA-256 do XML', () => {
    expect(result.xmlHash).toBeDefined();
    expect(result.xmlHash.length).toBe(64);
  });

  describe('Header', () => {
    it('deve extrair chave de acesso', () => {
      expect(result.header.chaveAcesso).toBe('50260306147451000647550010003346091924584034');
    });

    it('deve extrair número e série', () => {
      expect(result.header.numero).toBe('334609');
      expect(result.header.serie).toBe('1');
    });

    it('deve extrair CNPJ emitente e destinatário', () => {
      expect(result.header.cnpjEmitente).toBe('06147451000647');
      expect(result.header.cnpjDestinatario).toBe('73453060000133');
    });

    it('deve extrair UF do emitente e destinatário', () => {
      expect(result.header.emitState).toBe('MS');
      expect(result.header.destState).toBe('MT');
    });

    it('deve extrair nome do emitente', () => {
      expect(result.header.nomeEmitente).toContain('Calamo');
    });

    it('deve extrair natureza da operação', () => {
      expect(result.header.operationNature).toBeDefined();
      expect(result.header.operationNature.length).toBeGreaterThan(0);
    });

    it('deve extrair valor total', () => {
      expect(result.header.valorTotal).toBeCloseTo(1824.84, 2);
    });

    it('deve extrair informações adicionais', () => {
      expect(result.header.rawAdditionalInfo).toBeDefined();
    });

    it('deve extrair protocolo de autorização', () => {
      expect(result.header.rawProtocolNumber).toBe('150260011310653');
    });
  });

  describe('Items', () => {
    it('deve extrair 25 itens da nota', () => {
      expect(result.items.length).toBe(25);
    });

    it('deve manter itens repetidos separados (SKU 49766 aparece 2x)', () => {
      const items49766 = result.items.filter(i => i.cProd === '49766');
      expect(items49766.length).toBe(2);
      expect(items49766[0].nItem).not.toBe(items49766[1].nItem);
    });

    it('deve extrair nItem corretamente', () => {
      expect(result.items[0].nItem).toBe(1);
      expect(result.items[24].nItem).toBe(25);
    });

    describe('Item 1 (SKU 01314 - com ST)', () => {
      let item: typeof result.items[0];
      beforeAll(() => { item = result.items[0]; });

      it('deve ter SKU 01314', () => {
        expect(item.cProd).toBe('01314');
      });

      it('deve extrair descrição', () => {
        expect(item.xProd).toContain('ZAAD');
      });

      it('deve extrair NCM', () => {
        expect(item.ncm).toBe('33072010');
      });

      it('deve extrair CEST', () => {
        expect(item.cest).toBe('2002800');
      });

      it('deve extrair CFOP', () => {
        expect(item.cfop).toBe('6403');
      });

      it('deve extrair CST=10 (ST)', () => {
        expect(item.cst).toBe('10');
      });

      it('deve extrair orig', () => {
        expect(item.orig).toBe('5');
      });

      it('deve extrair vICMS regular', () => {
        expect(item.vIcms).toBeCloseTo(24.77, 2);
      });

      it('deve extrair pICMS regular', () => {
        expect(item.pIcms).toBeCloseTo(12.0, 1);
      });

      it('deve extrair vICMSST', () => {
        expect(item.vICMSST).toBeCloseTo(36.93, 2);
      });

      it('deve extrair vBCST', () => {
        expect(item.vBCST).toBeCloseTo(362.94, 2);
      });

      it('deve extrair pICMSST', () => {
        expect(item.pICMSST).toBeCloseTo(17.0, 1);
      });

      it('deve extrair pMVAST', () => {
        expect(item.pMVAST).toBeCloseTo(75.8, 1);
      });

      it('NÃO deve ter FCP-ST neste item', () => {
        expect(item.vFCPST).toBe(0);
        expect(item.pFCPST).toBe(0);
      });

      it('deve marcar stApplies=true e taxRegime=ST', () => {
        expect(item.stApplies).toBe(true);
        expect(item.taxRegime).toBe('ST');
      });

      it('deve calcular icmsStUnitAmount corretamente', () => {
        // 36.93 / 12 = 3.0775
        expect(item.icmsStUnitAmount).toBeCloseTo(3.0775, 3);
      });
    });

    describe('Item 4 (SKU 51468 - com FCP-ST)', () => {
      let item: typeof result.items[0];
      beforeAll(() => { item = result.items.find(i => i.cProd === '51468')!; });

      it('deve ter vFCPST > 0', () => {
        expect(item.vFCPST).toBeCloseTo(0.61, 2);
      });

      it('deve ter pFCPST > 0', () => {
        expect(item.pFCPST).toBeCloseTo(2.0, 1);
      });

      it('deve ter vBCFCPST > 0', () => {
        expect(item.vBCFCPST).toBeCloseTo(30.68, 2);
      });

      it('deve calcular fcpStUnitAmount', () => {
        // 0.61 / 1 = 0.61
        expect(item.fcpStUnitAmount).toBeCloseTo(0.61, 2);
      });
    });

    describe('Item 22 (SKU 87822 - orig diferente)', () => {
      let item: typeof result.items[0];
      beforeAll(() => { item = result.items.find(i => i.cProd === '87822')!; });

      it('deve ter orig=2 (importado)', () => {
        expect(item.orig).toBe('2');
      });
    });
  });

  it('deve rejeitar XML inválido', () => {
    expect(() => parseNfeXml('<invalid>not a nfe</invalid>')).toThrow();
  });
});
