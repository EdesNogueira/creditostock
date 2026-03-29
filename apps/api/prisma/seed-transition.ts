import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseNfeXml } from '../src/nfe/parser/nfe-xml-parser';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Lastro: Seed de Transição ST ===\n');

  // 1. Company & Branch
  const company = await prisma.company.upsert({
    where: { cnpj: '73453060000133' },
    update: {},
    create: {
      name: 'ANA LUCIA SIQUEIRA E CIA LTDA',
      cnpj: '73453060000133',
      tradeName: 'Loja O Boticário',
    },
  });
  console.log(`Empresa: ${company.name} (${company.cnpj})`);

  const branch = await prisma.branch.upsert({
    where: { cnpj: '73453060000133' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Filial Lucas do Rio Verde',
      cnpj: '73453060000133',
      city: 'Lucas do Rio Verde',
      state: 'MT',
      address: 'AV. RIO GRANDE DO SUL, 139 E',
    },
  });
  console.log(`Filial: ${branch.name} — ${branch.city}/${branch.state}`);

  // 2. Import real XML NF-e
  const xmlPath = path.resolve(__dirname, '../../../fixtures/sample-nfe-real.xml');
  if (!fs.existsSync(xmlPath)) {
    console.error(`Fixture XML não encontrada: ${xmlPath}`);
    process.exit(1);
  }

  const xmlString = fs.readFileSync(xmlPath, 'utf-8');
  const parsed = parseNfeXml(xmlString);

  const existingDoc = await prisma.nfeDocument.findUnique({ where: { chaveAcesso: parsed.header.chaveAcesso } });
  let doc;

  if (existingDoc) {
    console.log(`NF-e ${parsed.header.numero} já importada, usando existente`);
    doc = existingDoc;
  } else {
    doc = await prisma.nfeDocument.create({
      data: {
        branchId: branch.id,
        chaveAcesso: parsed.header.chaveAcesso,
        numero: parsed.header.numero,
        serie: parsed.header.serie,
        dataEmissao: new Date(parsed.header.dataEmissao),
        cnpjEmitente: parsed.header.cnpjEmitente,
        nomeEmitente: parsed.header.nomeEmitente,
        cnpjDestinatario: parsed.header.cnpjDestinatario,
        valorTotal: parsed.header.valorTotal,
        emitState: parsed.header.emitState,
        destState: parsed.header.destState,
        operationNature: parsed.header.operationNature,
        rawProtocolNumber: parsed.header.rawProtocolNumber,
        rawAdditionalInfo: parsed.header.rawAdditionalInfo,
        rawXml: xmlString,
        xmlHash: parsed.xmlHash,
        parserVersion: parsed.header.parserVersion,
        importSource: 'seed-transition',
        jobStatus: 'DONE',
      },
    });

    for (const item of parsed.items) {
      await prisma.nfeItem.create({
        data: {
          nfeDocumentId: doc.id,
          nItem: item.nItem,
          cProd: item.cProd,
          xProd: item.xProd,
          cEan: item.cEan,
          ncm: item.ncm,
          cest: item.cest,
          cfop: item.cfop,
          uCom: item.uCom,
          qCom: item.qCom,
          vUnCom: item.vUnCom,
          vProd: item.vProd,
          orig: item.orig,
          cst: item.cst,
          csosn: item.csosn,
          modBC: item.modBC,
          vBC: item.vBC,
          pIcms: item.pIcms,
          vIcms: item.vIcms,
          modBCST: item.modBCST,
          pMVAST: item.pMVAST,
          vBCST: item.vBCST,
          pICMSST: item.pICMSST,
          vICMSST: item.vICMSST,
          vBCFCPST: item.vBCFCPST,
          pFCPST: item.pFCPST,
          vFCPST: item.vFCPST,
          taxRegime: item.taxRegime,
          stApplies: item.stApplies,
          icmsUnitAmount: item.icmsUnitAmount,
          icmsStUnitAmount: item.icmsStUnitAmount,
          fcpStUnitAmount: item.fcpStUnitAmount,
          rawTaxJson: item.rawTaxJson as Prisma.InputJsonValue,
        },
      });
    }
    console.log(`NF-e ${parsed.header.numero} importada: ${parsed.items.length} itens, ${parsed.items.filter(i => i.stApplies).length} com ST`);
  }

  // 3. Create stock snapshot (simulating real stock based on NF-e items)
  const refDate = new Date('2026-03-28');
  const snapshot = await prisma.stockSnapshot.create({
    data: {
      branchId: branch.id,
      referenceDate: refDate,
      fileName: 'seed-estoque-transicao.csv',
      totalItems: parsed.items.length,
      parserVersion: parsed.header.parserVersion,
      importSource: 'seed-transition',
      jobStatus: 'DONE',
    },
  });

  const nfeItems = await prisma.nfeItem.findMany({ where: { nfeDocumentId: doc.id } });
  const stockItems = [];
  for (const ni of nfeItems) {
    // stock has slightly less than purchased (simulating some items sold)
    const stockQty = Math.max(1, Math.floor(parseFloat(String(ni.qCom)) * 0.9));
    const si = await prisma.stockSnapshotItem.create({
      data: {
        snapshotId: snapshot.id,
        rawSku: ni.cProd,
        rawDescription: ni.xProd,
        rawNcm: ni.ncm,
        quantity: stockQty,
        unitCost: parseFloat(String(ni.vUnCom)),
        totalCost: stockQty * parseFloat(String(ni.vUnCom)),
        unit: ni.uCom,
      },
    });
    stockItems.push({ si, ni, stockQty });
  }
  console.log(`Snapshot criado: ${stockItems.length} itens na data ${refDate.toISOString().split('T')[0]}`);

  // 4. Create allocations (FIFO simulated)
  for (const { si, ni, stockQty } of stockItems) {
    const niQty = parseFloat(String(ni.qCom));
    const proportion = stockQty / niQty;

    await prisma.stockOriginAllocation.create({
      data: {
        stockSnapshotItemId: si.id,
        nfeItemId: ni.id,
        strategy: 'FIFO',
        allocatedQty: stockQty,
        allocatedCost: parseFloat(String(ni.vProd)) * proportion,
        allocatedIcms: parseFloat(String(ni.vIcms)) * proportion,
        sourceTaxRegime: ni.taxRegime,
        allocatedRegularIcms: parseFloat(String(ni.vIcms)) * proportion,
        allocatedIcmsSt: parseFloat(String(ni.vICMSST)) * proportion,
        allocatedFcpSt: parseFloat(String(ni.vFCPST)) * proportion,
        unitRegularIcms: parseFloat(String(ni.icmsUnitAmount)),
        unitIcmsSt: parseFloat(String(ni.icmsStUnitAmount)),
        unitFcpSt: parseFloat(String(ni.fcpStUnitAmount)),
      },
    });

    await prisma.productMatch.create({
      data: {
        stockSnapshotItemId: si.id,
        nfeItemId: ni.id,
        matchType: 'EXACT_SKU',
        confidence: 1.0,
        isConfirmed: true,
      },
    });
  }
  console.log(`Alocações FIFO criadas: ${stockItems.length}`);

  // 5. Create Transition Rule
  const rule = await prisma.taxTransitionRule.create({
    data: {
      name: 'Transição ST → Normal — MT — Cosméticos',
      description: 'Regra para crédito de transição de ICMS-ST para regime normal no estado do MT, segmento de cosméticos',
      stateFrom: 'MS',
      stateTo: 'MT',
      effectiveFrom: new Date('2026-01-01'),
      cfopList: '6403',
      cstList: '10',
      taxRegimeBefore: 'ST',
      taxRegimeAfter: 'NORMAL',
      calcMethod: 'PROPORTIONAL_ST_ONLY',
      includeFcpStInCredit: false,
      isActive: true,
    },
  });
  console.log(`Regra de transição criada: ${rule.name}`);

  // Summary
  const stItems = nfeItems.filter(i => i.stApplies);
  const totalSt = stItems.reduce((s, i) => s + parseFloat(String(i.vICMSST)), 0);
  const totalFcp = stItems.reduce((s, i) => s + parseFloat(String(i.vFCPST)), 0);

  console.log(`\n=== Resumo do Seed ===`);
  console.log(`Empresa: ${company.name}`);
  console.log(`Filial: ${branch.name} — ${branch.state}`);
  console.log(`NF-e: ${doc.chaveAcesso.slice(0, 25)}... (${nfeItems.length} itens)`);
  console.log(`Itens com ST: ${stItems.length}`);
  console.log(`Total ICMS-ST na NF: R$ ${totalSt.toFixed(2)}`);
  console.log(`Total FCP-ST na NF: R$ ${totalFcp.toFixed(2)}`);
  console.log(`Regra de transição: ${rule.name}`);
  console.log(`\nPara rodar o cálculo de transição, use:`);
  console.log(`POST /calculations/run com body:`);
  console.log(`{`);
  console.log(`  "branchId": "${branch.id}",`);
  console.log(`  "kind": "ST_TRANSITION",`);
  console.log(`  "transitionRuleId": "${rule.id}",`);
  console.log(`  "transitionReferenceDate": "${refDate.toISOString().split('T')[0]}"`);
  console.log(`}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
