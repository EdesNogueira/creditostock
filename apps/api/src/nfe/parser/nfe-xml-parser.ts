import { XMLParser } from 'fast-xml-parser';
import * as crypto from 'crypto';

const PARSER_VERSION = '2.0.0';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedNfeHeader {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  emitState: string;
  cnpjDestinatario: string;
  destState: string;
  valorTotal: number;
  operationNature: string;
  rawProtocolNumber: string | null;
  rawAdditionalInfo: string | null;
  parserVersion: string;
}

export interface ParsedNfeItem {
  nItem: number;
  cProd: string;
  xProd: string;
  cEan: string | null;
  ncm: string;
  cest: string | null;
  cfop: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  extIpi: string | null;
  supplierOrderRef: string | null;

  // ICMS regular
  orig: string;
  cst: string;
  csosn: string | null;
  modBC: string | null;
  vBC: number;
  pIcms: number;
  vIcms: number;

  // ICMS-ST
  modBCST: string | null;
  pMVAST: number;
  vBCST: number;
  pICMSST: number;
  vICMSST: number;

  // FCP-ST
  vBCFCPST: number;
  pFCPST: number;
  vFCPST: number;

  // Derived
  taxRegime: 'UNKNOWN' | 'NORMAL' | 'ST';
  stApplies: boolean;
  icmsUnitAmount: number;
  icmsStUnitAmount: number;
  fcpStUnitAmount: number;

  rawTaxJson: Record<string, unknown>;
}

export interface ParsedNfe {
  header: ParsedNfeHeader;
  items: ParsedNfeItem[];
  xmlHash: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  const n = parseFloat(String(v ?? '0'));
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function extractIcmsGroup(icms: Record<string, unknown> | undefined): { group: Record<string, unknown>; groupName: string } {
  if (!icms) return { group: {}, groupName: '' };

  const keys = Object.keys(icms);
  for (const key of keys) {
    if (key.startsWith('ICMS') || key.startsWith('icms')) {
      const val = icms[key];
      if (val && typeof val === 'object') {
        return { group: val as Record<string, unknown>, groupName: key };
      }
    }
  }
  return { group: {}, groupName: '' };
}

function detectTaxRegime(icmsGroup: Record<string, unknown>, vICMSST: number): { regime: 'UNKNOWN' | 'NORMAL' | 'ST'; stApplies: boolean } {
  if (vICMSST > 0) return { regime: 'ST', stApplies: true };

  const cst = str(icmsGroup.CST);
  const stCsts = ['10', '30', '60', '70'];
  if (stCsts.includes(cst)) return { regime: 'ST', stApplies: true };

  if (cst === '00' || cst === '20' || cst === '40' || cst === '41' || cst === '50' || cst === '51') {
    return { regime: 'NORMAL', stApplies: false };
  }

  return { regime: 'UNKNOWN', stApplies: false };
}

// ─── Main Parser ────────────────────────────────────────────────────────────

export function parseNfeXml(xmlString: string): ParsedNfe {
  const xmlHash = crypto.createHash('sha256').update(xmlString).digest('hex');

  const parsed = xmlParser.parse(xmlString);
  const nfeProc = parsed.nfeProc ?? parsed;
  const nfeNode =
    nfeProc.NFe?.infNFe ??
    nfeProc.infNFe ??
    nfeProc.NFe ??
    parsed.NFe?.infNFe ??
    parsed.NFe ??
    parsed.infNFe;
  const nfe = nfeNode?.infNFe ?? nfeNode;

  if (!nfe) {
    throw new Error('Estrutura XML de NF-e inválida: infNFe não encontrado');
  }

  const ide = nfe.ide;
  const emit = nfe.emit;
  const dest = nfe.dest;
  const total = nfe.total?.ICMSTot;
  const infAdic = nfe.infAdic;
  const protNFe = nfeProc.protNFe?.infProt;

  const chaveRaw = nfe['@_Id'] ?? nfeNode['@_Id'] ?? '';
  const chave = str(chaveRaw).replace(/^NFe/, '');

  const header: ParsedNfeHeader = {
    chaveAcesso: chave,
    numero: str(ide?.nNF),
    serie: str(ide?.serie ?? '1'),
    dataEmissao: str(ide?.dhEmi ?? ide?.dEmi),
    cnpjEmitente: str(emit?.CNPJ ?? emit?.CPF),
    nomeEmitente: str(emit?.xNome ?? emit?.xFant),
    emitState: str(emit?.enderEmit?.UF),
    cnpjDestinatario: str(dest?.CNPJ ?? dest?.CPF),
    destState: str(dest?.enderDest?.UF),
    valorTotal: num(total?.vNF),
    operationNature: str(ide?.natOp),
    rawProtocolNumber: protNFe?.nProt ? str(protNFe.nProt) : null,
    rawAdditionalInfo: infAdic?.infCpl ? str(infAdic.infCpl) : null,
    parserVersion: PARSER_VERSION,
  };

  const rawDet = nfe.det;
  const detArray = Array.isArray(rawDet) ? rawDet : [rawDet].filter(Boolean);

  const items: ParsedNfeItem[] = detArray.map((det: Record<string, unknown>) => {
    const prod = det.prod as Record<string, unknown>;
    const imposto = det.imposto as Record<string, unknown> | undefined;
    const icms = imposto?.ICMS as Record<string, unknown> | undefined;

    const { group: icmsGroup } = extractIcmsGroup(icms);

    const vICMSST = num(icmsGroup.vICMSST);
    const vFCPST = num(icmsGroup.vFCPST);
    const vIcms = num(icmsGroup.vICMS);
    const qCom = num(prod.qCom);

    const { regime, stApplies } = detectTaxRegime(icmsGroup, vICMSST);

    const item: ParsedNfeItem = {
      nItem: parseInt(str(det['@_nItem'] ?? '0'), 10),
      cProd: str(prod.cProd),
      xProd: str(prod.xProd),
      cEan: str(prod.cEAN) !== 'SEM GTIN' && str(prod.cEAN) !== '' ? str(prod.cEAN) : null,
      ncm: str(prod.NCM),
      cest: str(prod.CEST) || null,
      cfop: str(prod.CFOP),
      uCom: str(prod.uCom ?? 'UN'),
      qCom,
      vUnCom: num(prod.vUnCom),
      vProd: num(prod.vProd),
      extIpi: str(prod.EXTIPI) || null,
      supplierOrderRef: str(prod.xPed) || null,

      orig: str(icmsGroup.orig),
      cst: str(icmsGroup.CST),
      csosn: str(icmsGroup.CSOSN) || null,
      modBC: str(icmsGroup.modBC) || null,
      vBC: num(icmsGroup.vBC),
      pIcms: num(icmsGroup.pICMS),
      vIcms,

      modBCST: str(icmsGroup.modBCST) || null,
      pMVAST: num(icmsGroup.pMVAST),
      vBCST: num(icmsGroup.vBCST),
      pICMSST: num(icmsGroup.pICMSST),
      vICMSST,

      vBCFCPST: num(icmsGroup.vBCFCPST),
      pFCPST: num(icmsGroup.pFCPST),
      vFCPST,

      taxRegime: regime,
      stApplies,
      icmsUnitAmount: safeDiv(vIcms, qCom),
      icmsStUnitAmount: safeDiv(vICMSST, qCom),
      fcpStUnitAmount: safeDiv(vFCPST, qCom),

      rawTaxJson: icmsGroup,
    };

    return item;
  });

  return { header, items, xmlHash };
}

export function getParserVersion(): string {
  return PARSER_VERSION;
}
