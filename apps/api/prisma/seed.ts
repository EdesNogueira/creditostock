import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'GO'];
const UNITS = ['UN', 'CX', 'KG', 'LT', 'MT', 'PC', 'RL'];
const NCM_LIST = [
  '84713019', '84733020', '84716070', '39199090', '85176292',
  '84789000', '39235000', '48192000', '96190000', '33030020',
];
const CFOP_LIST = ['5102', '5405', '6102', '6403', '1102', '1403'];

function randomCnpj(index: number): string {
  const n = String(index).padStart(12, '0');
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-00`;
}

function randomDecimal(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Seeding database...');

  // Company
  const company = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Distribuidora Demo Ltda',
      cnpj: '12.345.678/0001-90',
      tradeName: 'Demo Distribuição',
    },
  });

  // Branches
  const branch1 = await prisma.branch.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Filial São Paulo',
      cnpj: '12.345.678/0001-90',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { cnpj: '12.345.678/0002-71' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Filial Rio de Janeiro',
      cnpj: '12.345.678/0002-71',
      address: 'Rua da Assembleia, 200',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  });

  // Admin user
  const passwordHash = await bcrypt.hash('password123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@creditostock.com.br' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Administrador Demo',
      email: 'admin@creditostock.com.br',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'analyst@creditostock.com.br' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Analista Fiscal',
      email: 'analyst@creditostock.com.br',
      passwordHash,
      role: UserRole.ANALYST,
    },
  });

  // 50 Products
  const products = [];
  const productNames = [
    'Notebook 15.6" Intel Core i5', 'Mouse Sem Fio USB', 'Teclado Mecânico RGB',
    'Monitor LED 24"', 'Headset Gamer 7.1', 'Webcam Full HD 1080p',
    'SSD 500GB SATA', 'Memória RAM 8GB DDR4', 'Fonte ATX 500W',
    'Placa de Vídeo GTX 1650', 'Roteador Wi-Fi AC1200', 'Switch 8 Portas Gigabit',
    'Impressora Laser Monocromática', 'Scanner de Mesa A4', 'Projetor LED 3000 Lumens',
    'HD Externo 1TB USB 3.0', 'Pen Drive 64GB USB 3.0', 'Leitor de Cartão SD',
    'Cabo HDMI 2.0 2m', 'Adaptador USB-C para HDMI', 'Hub USB 4 Portas',
    'Suporte para Monitor Articulado', 'Mesa Digitalizadora A5', 'Controle para PC',
    'Caixa de Som Bluetooth 20W', 'Microfone Condensador USB', 'Tela para Projetor',
    'Rack de Servidor 12U', 'No-break 1400VA', 'Estabilizador 1000VA',
    'Papel A4 500 Folhas', 'Cartucho Tinta Preto', 'Cartucho Tinta Colorido',
    'Toner Laser Preto', 'Fita Adesiva 48mm', 'Envelope A4 Kraft',
    'Caderno Executivo 200 Fls', 'Caneta Esferográfica Azul cx12', 'Post-it 76x76mm',
    'Calculadora Científica', 'Grampeador 26/6', 'Perfurador 2 Furos',
    'Arquivo Morto Plástico', 'Pasta Suspensa cx50', 'Caixa Organizadora 30L',
    'Etiqueta Adesiva A4', 'Ribbon Zebra 110mm', 'Balança Digital 30kg',
    'Coletora de Dados', 'Impressora de Etiquetas',
  ];

  for (let i = 0; i < 50; i++) {
    const sku = `PRD-${String(i + 1).padStart(4, '0')}`;
    const prod = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku } },
      update: {},
      create: {
        companyId: company.id,
        sku,
        ean: `789${String(i).padStart(10, '0')}`,
        description: productNames[i],
        ncm: pick(NCM_LIST),
        unit: pick(UNITS),
      },
    });
    products.push(prod);

    // Add alias
    await prisma.productAlias.upsert({
      where: { aliasType_aliasValue: { aliasType: 'supplier_code', aliasValue: `FORN-${sku}` } },
      update: {},
      create: {
        productId: prod.id,
        aliasType: 'supplier_code',
        aliasValue: `FORN-${sku}`,
        sourceNote: 'Código do fornecedor principal',
      },
    });
  }

  // Stock Snapshot with 200 items (branch1)
  const snapshot = await prisma.stockSnapshot.create({
    data: {
      branchId: branch1.id,
      referenceDate: new Date('2024-12-31'),
      fileName: 'estoque_dez2024.xlsx',
      totalItems: 200,
      jobStatus: 'DONE',
    },
  });

  const snapshotItems = [];
  for (let i = 0; i < 200; i++) {
    const prod = products[i % 50];
    const qty = randomDecimal(1, 500);
    const unitCost = randomDecimal(10, 2000);
    const item = await prisma.stockSnapshotItem.create({
      data: {
        snapshotId: snapshot.id,
        productId: prod.id,
        rawSku: prod.sku,
        rawEan: prod.ean ?? undefined,
        rawDescription: prod.description,
        rawNcm: prod.ncm ?? undefined,
        quantity: qty,
        unitCost,
        totalCost: qty * unitCost,
        unit: prod.unit,
      },
    });
    snapshotItems.push(item);
  }

  // 100 NF-e Documents with items (branch1)
  const nfeDocs = [];
  for (let i = 0; i < 100; i++) {
    const chave = String(i + 1).padStart(44, '0');
    const doc = await prisma.nfeDocument.create({
      data: {
        branchId: branch1.id,
        chaveAcesso: chave,
        numero: String(1000 + i),
        serie: '1',
        dataEmissao: new Date(2024, Math.floor(i / 10), (i % 28) + 1),
        cnpjEmitente: randomCnpj(i + 100),
        nomeEmitente: `Fornecedor ${String.fromCharCode(65 + (i % 26))} Comércio Ltda`,
        cnpjDestinatario: branch1.cnpj,
        valorTotal: randomDecimal(500, 50000),
        jobStatus: 'DONE',
      },
    });
    nfeDocs.push(doc);

    // 3-6 items per NF-e
    const itemCount = 3 + (i % 4);
    for (let j = 0; j < itemCount; j++) {
      const prod = products[(i * 3 + j) % 50];
      const qty = randomDecimal(1, 100);
      const unitPrice = randomDecimal(10, 2000);
      const vProd = qty * unitPrice;
      const pIcms = [7, 12, 17, 18][Math.floor(Math.random() * 4)];
      const vIcms = vProd * (pIcms / 100);

      await prisma.nfeItem.create({
        data: {
          nfeDocumentId: doc.id,
          productId: prod.id,
          cProd: prod.sku,
          xProd: prod.description,
          cEan: prod.ean ?? undefined,
          ncm: prod.ncm ?? undefined,
          cfop: pick(CFOP_LIST),
          uCom: prod.unit,
          qCom: qty,
          vUnCom: unitPrice,
          vProd: parseFloat(vProd.toFixed(2)),
          vIcms: parseFloat(vIcms.toFixed(2)),
          pIcms,
          cst: '000',
        },
      });
    }
  }

  // ProductMatches (link stock items to nfe items)
  const nfeItemsForMatch = await prisma.nfeItem.findMany({ take: 150 });
  for (let i = 0; i < Math.min(150, snapshotItems.length); i++) {
    const si = snapshotItems[i];
    const nfeItem = nfeItemsForMatch[i % nfeItemsForMatch.length];
    const isConfirmed = i < 120;
    await prisma.productMatch.create({
      data: {
        stockSnapshotItemId: si.id,
        nfeItemId: nfeItem.id,
        productId: si.productId,
        matchType: i < 80 ? 'EXACT_SKU' : i < 120 ? 'EXACT_EAN' : 'FUZZY_DESCRIPTION_NCM',
        confidence: i < 80 ? 1.0 : i < 120 ? 1.0 : 0.75,
        isConfirmed,
        confirmedAt: isConfirmed ? new Date() : null,
      },
    });

    if (isConfirmed) {
      const nfeItemFull = await prisma.nfeItem.findUnique({ where: { id: nfeItem.id } });
      if (nfeItemFull) {
        await prisma.stockOriginAllocation.create({
          data: {
            stockSnapshotItemId: si.id,
            nfeItemId: nfeItem.id,
            strategy: 'FIFO',
            allocatedQty: parseFloat(String(nfeItemFull.qCom)),
            allocatedCost: parseFloat(String(nfeItemFull.vProd)),
            allocatedIcms: parseFloat(String(nfeItemFull.vIcms)),
          },
        });
      }
    }
  }

  // Issues (50 open)
  for (let i = 0; i < 50; i++) {
    const si = snapshotItems[150 + i];
    const types = [
      { title: 'SKU não encontrado em NF-e', severity: 'HIGH' as const },
      { title: 'Quantidade insuficiente em notas', severity: 'MEDIUM' as const },
      { title: 'NCM divergente entre estoque e nota', severity: 'LOW' as const },
      { title: 'Nota fiscal cancelada', severity: 'CRITICAL' as const },
    ];
    const t = types[i % types.length];
    await prisma.issue.create({
      data: {
        stockSnapshotItemId: si.id,
        title: t.title,
        severity: t.severity,
        status: i < 30 ? 'OPEN' : i < 40 ? 'IN_PROGRESS' : 'RESOLVED',
        description: `Item ${si.rawSku} - ${si.rawDescription}`,
        resolvedAt: i >= 40 ? new Date() : null,
      },
    });
  }

  // Credit Calculation
  await prisma.creditCalculation.create({
    data: {
      branchId: branch1.id,
      mode: 'ASSISTED',
      status: 'DONE',
      totalStockCost: 3850000,
      totalIcmsPaid: 385000,
      potentialCredit: 230000,
      approvedCredit: 185000,
      blockedCredit: 45000,
      reconciledPct: 75,
      startedAt: new Date(Date.now() - 3600000),
      finishedAt: new Date(),
    },
  });

  // Dossier
  await prisma.dossier.create({
    data: {
      branchId: branch1.id,
      title: 'Dossiê ICMS Estoque Dez/2024 - Filial SP',
      status: 'PENDING_REVIEW',
      notes: 'Dossiê gerado automaticamente a partir do inventário de dezembro/2024.',
    },
  });

  // Tax Rules
  await prisma.taxRule.createMany({
    data: [
      { name: 'ICMS SP padrão', state: 'SP', icmsRate: 18, cfopList: '5102,6102', isActive: true },
      { name: 'ICMS RJ padrão', state: 'RJ', icmsRate: 20, cfopList: '5102,6102', isActive: true },
      { name: 'ICMS MG padrão', state: 'MG', icmsRate: 18, cfopList: '5102', isActive: true },
      { name: 'ICMS Informatica SP', state: 'SP', ncmRange: '8471-8473', icmsRate: 12, isActive: true },
    ],
    skipDuplicates: true,
  });

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      { companyId: company.id, action: 'IMPORT', entity: 'StockSnapshot', entityId: snapshot.id, payload: { fileName: 'estoque_dez2024.xlsx', rows: 200 } },
      { companyId: company.id, action: 'IMPORT', entity: 'NfeDocument', payload: { count: 100 } },
      { companyId: company.id, action: 'CALCULATE', entity: 'CreditCalculation', payload: { mode: 'ASSISTED' } },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed completed!');
  console.log(`   Company: ${company.name} (${company.cnpj})`);
  console.log(`   Branches: 2 (${branch1.name}, ${branch2.name})`);
  console.log(`   Products: 50`);
  console.log(`   Stock items: 200`);
  console.log(`   NF-e documents: 100`);
  console.log(`   Login: admin@creditostock.com.br / password123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
