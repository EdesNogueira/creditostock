import 'dotenv/config';
import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

const redisOptions = {
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
  },
};

// ─── Queue definitions ────────────────────────────────────────────────────────
const stockImportQueue = new Queue('stock-import', redisOptions);
const nfeImportQueue = new Queue('nfe-import', redisOptions);
const matchingQueue = new Queue('matching', redisOptions);
const calculationsQueue = new Queue('calculations', redisOptions);
const dossiersQueue = new Queue('dossiers', redisOptions);

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// ─── Stock Import Processor ───────────────────────────────────────────────────
stockImportQueue.process('process-stock-import', async (job) => {
  const { snapshotId, rows } = job.data;
  console.log(`[stock-import] Processing snapshot ${snapshotId}, ${rows.length} rows`);

  await prisma.stockSnapshot.update({ where: { id: snapshotId }, data: { jobStatus: 'PROCESSING' } });

  for (const row of rows) {
    // Try to find existing product by SKU
    let product = await prisma.product.findFirst({
      where: { OR: [{ sku: row.sku }, { ean: row.ean ?? undefined }] },
    });

    if (!product && row.ean) {
      const alias = await prisma.productAlias.findFirst({
        where: { aliasType: 'ean', aliasValue: row.ean },
        include: { product: true },
      });
      product = alias?.product ?? null;
    }

    await prisma.stockSnapshotItem.create({
      data: {
        snapshotId,
        productId: product?.id,
        rawSku: row.sku,
        rawEan: row.ean,
        rawDescription: row.description,
        rawNcm: row.ncm,
        quantity: row.quantity,
        unitCost: row.unitCost,
        totalCost: row.totalCost,
        unit: row.unit,
      },
    });
  }

  await prisma.stockSnapshot.update({
    where: { id: snapshotId },
    data: { jobStatus: 'DONE', totalItems: rows.length },
  });

  console.log(`[stock-import] Done: ${snapshotId}`);
});

// ─── NFe Import Processor ─────────────────────────────────────────────────────
nfeImportQueue.process('process-nfe-items', async (job) => {
  const { documentId } = job.data;
  console.log(`[nfe-import] Processing document ${documentId}`);

  const doc = await prisma.nfeDocument.findUnique({ where: { id: documentId } });
  if (!doc?.rawXml) {
    await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'FAILED', jobError: 'No XML data' } });
    return;
  }

  await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'PROCESSING' } });

  const parsed = xmlParser.parse(doc.rawXml);
  const nfeProc = parsed.nfeProc ?? parsed;
  const nfe = nfeProc.NFe?.infNFe ?? nfeProc.infNFe;
  const rawDet = nfe?.det;
  const items = Array.isArray(rawDet) ? rawDet : [rawDet].filter(Boolean);

  for (const det of items) {
    const prod = det.prod;
    const icms = det.imposto?.ICMS;
    const icmsGroup = icms ? Object.values(icms)[0] as Record<string, unknown> : {};
    const vIcms = parseFloat(String(icmsGroup?.vICMS ?? 0));
    const pIcms = parseFloat(String(icmsGroup?.pICMS ?? 0));
    const cst = String(icmsGroup?.CST ?? icmsGroup?.CSOSN ?? '');

    const sku = String(prod.cProd ?? '');
    const ean = String(prod.cEAN ?? '');

    let product = await prisma.product.findFirst({ where: { sku } });
    if (!product && ean && ean !== 'SEM GTIN') {
      product = await prisma.product.findFirst({ where: { ean } });
    }

    await prisma.nfeItem.create({
      data: {
        nfeDocumentId: documentId,
        productId: product?.id,
        cProd: sku,
        xProd: String(prod.xProd ?? ''),
        cEan: ean !== 'SEM GTIN' ? ean : undefined,
        ncm: String(prod.NCM ?? ''),
        cfop: String(prod.CFOP ?? ''),
        uCom: String(prod.uCom ?? 'UN'),
        qCom: parseFloat(String(prod.qCom ?? 0)),
        vUnCom: parseFloat(String(prod.vUnCom ?? 0)),
        vProd: parseFloat(String(prod.vProd ?? 0)),
        vIcms,
        pIcms,
        cst,
      },
    });
  }

  await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'DONE' } });
  console.log(`[nfe-import] Done: ${documentId}, ${items.length} items`);
});

// ─── Matching Engine ──────────────────────────────────────────────────────────
matchingQueue.process('run-matching', async (job) => {
  const { snapshotId } = job.data;
  console.log(`[matching] Running matching for snapshot ${snapshotId}`);

  const stockItems = await prisma.stockSnapshotItem.findMany({
    where: { snapshotId },
    include: { productMatches: true },
  });

  const nfeItems = await prisma.nfeItem.findMany({
    include: { nfeDocument: true },
    orderBy: { nfeDocument: { dataEmissao: 'asc' } },
  });

  let matchCount = 0;

  for (const si of stockItems) {
    if (si.productMatches.length > 0) continue;

    // 1. Exact SKU match
    let matched = nfeItems.find((ni) => ni.cProd === si.rawSku);
    let matchType: 'EXACT_SKU' | 'EXACT_EAN' | 'ALIAS' | 'FUZZY_DESCRIPTION_NCM' | null = null;

    if (matched) {
      matchType = 'EXACT_SKU';
    } else if (si.rawEan) {
      // 2. Exact EAN match
      matched = nfeItems.find((ni) => ni.cEan === si.rawEan);
      if (matched) matchType = 'EXACT_EAN';
    }

    if (!matched && si.rawNcm) {
      // 3. Fuzzy description + NCM
      const descWords = si.rawDescription.toLowerCase().split(' ').filter((w) => w.length > 3);
      matched = nfeItems.find((ni) => {
        const ncmMatch = ni.ncm === si.rawNcm;
        const descMatch = descWords.some((w) => ni.xProd.toLowerCase().includes(w));
        return ncmMatch && descMatch;
      });
      if (matched) matchType = 'FUZZY_DESCRIPTION_NCM';
    }

    if (matched && matchType) {
      await prisma.productMatch.create({
        data: {
          stockSnapshotItemId: si.id,
          nfeItemId: matched.id,
          productId: si.productId,
          matchType,
          confidence: matchType === 'FUZZY_DESCRIPTION_NCM' ? 0.75 : 1.0,
          isConfirmed: matchType !== 'FUZZY_DESCRIPTION_NCM',
        },
      });

      // FIFO allocation
      await prisma.stockOriginAllocation.create({
        data: {
          stockSnapshotItemId: si.id,
          nfeItemId: matched.id,
          strategy: 'FIFO',
          allocatedQty: parseFloat(String(matched.qCom)),
          allocatedCost: parseFloat(String(matched.vProd)),
          allocatedIcms: parseFloat(String(matched.vIcms)),
        },
      });

      matchCount++;
    } else {
      // Create issue for unmatched
      await prisma.issue.create({
        data: {
          stockSnapshotItemId: si.id,
          title: 'Item de estoque sem NF-e correspondente',
          description: `SKU: ${si.rawSku} | Descrição: ${si.rawDescription}`,
          severity: 'HIGH',
          status: 'OPEN',
        },
      });
    }
  }

  console.log(`[matching] Done: ${matchCount} matches out of ${stockItems.length} stock items`);
});

// ─── Calculations Processor ───────────────────────────────────────────────────
calculationsQueue.process('run-calculation', async (job) => {
  const { calculationId, snapshotId } = job.data;
  console.log(`[calculations] Running calculation ${calculationId}`);

  await prisma.creditCalculation.update({
    where: { id: calculationId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const calc = await prisma.creditCalculation.findUnique({ where: { id: calculationId } });
  if (!calc) return;

  const allocations = await prisma.stockOriginAllocation.findMany({
    where: { stockSnapshotItem: { snapshot: { branchId: calc.branchId } } },
  });

  const totalStockCost = allocations.reduce((sum, a) => sum + parseFloat(String(a.allocatedCost)), 0);
  const totalIcmsPaid = allocations.reduce((sum, a) => sum + parseFloat(String(a.allocatedIcms)), 0);
  const potentialCredit = totalIcmsPaid * 0.6;
  const approvedCredit = potentialCredit * 0.8;
  const blockedCredit = potentialCredit - approvedCredit;

  const totalItems = snapshotId
    ? await prisma.stockSnapshotItem.count({ where: { snapshotId } })
    : await prisma.stockSnapshotItem.count({ where: { snapshot: { branchId: calc.branchId } } });
  const matchedItems = await prisma.productMatch.count({
    where: { isConfirmed: true, stockSnapshotItem: { snapshot: { branchId: calc.branchId } } },
  });
  const reconciledPct = totalItems > 0 ? (matchedItems / totalItems) * 100 : 0;

  await prisma.creditCalculation.update({
    where: { id: calculationId },
    data: {
      status: 'DONE',
      totalStockCost,
      totalIcmsPaid,
      potentialCredit,
      approvedCredit,
      blockedCredit,
      reconciledPct,
      finishedAt: new Date(),
    },
  });

  console.log(`[calculations] Done: ${calculationId}, credit: ${potentialCredit.toFixed(2)}`);
});

// ─── Dossier Generator ───────────────────────────────────────────────────────
dossiersQueue.process('generate-dossier', async (job) => {
  const { dossierId } = job.data;
  console.log(`[dossiers] Generating dossier ${dossierId}`);

  await prisma.dossier.update({
    where: { id: dossierId },
    data: { status: 'PENDING_REVIEW' },
  });

  // In production: generate PDF/ZIP with all NF-e XMLs, reconciliation data, etc.
  // For MVP: just mark as pending review
  console.log(`[dossiers] Done: ${dossierId}`);
});

// ─── Error handlers ───────────────────────────────────────────────────────────
[stockImportQueue, nfeImportQueue, matchingQueue, calculationsQueue, dossiersQueue].forEach((q) => {
  q.on('failed', (job, err) => {
    console.error(`[${q.name}] Job ${job.id} failed:`, err.message);
  });
  q.on('completed', (job) => {
    console.log(`[${q.name}] Job ${job.id} completed`);
  });
});

console.log('🔧 CreditoStock Worker started - listening for jobs...');
