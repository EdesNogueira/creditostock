import 'dotenv/config';
import Queue from 'bull';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseNfeXml, getParserVersion } from '../../api/src/nfe/parser/nfe-xml-parser';

const prisma = new PrismaClient();

function parseRedisConfig() {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const u = new URL(url);
      return {
        host: u.hostname,
        port: parseInt(u.port) || 6379,
        password: u.password || undefined,
        tls: u.protocol === 'rediss:' ? {} : undefined,
      };
    } catch { /* fall through */ }
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

const redisOptions = { redis: parseRedisConfig() };

const stockImportQueue = new Queue('stock-import', redisOptions);
const nfeImportQueue = new Queue('nfe-import', redisOptions);
const matchingQueue = new Queue('matching', redisOptions);
const calculationsQueue = new Queue('calculations', redisOptions);
const transitionCalcQueue = new Queue('transition-calculations', redisOptions);
const dossiersQueue = new Queue('dossiers', redisOptions);

const stripZeros = (s: string) => s.replace(/^0+/, '') || '0';
const dec = (v: unknown): number => parseFloat(String(v ?? '0')) || 0;

// ─── Stock Import Processor ───────────────────────────────────────────────────
stockImportQueue.process('process-stock-import', async (job) => {
  const { snapshotId, rows } = job.data;
  console.log(`[stock-import] Processing snapshot ${snapshotId}, ${rows.length} rows`);

  await prisma.stockSnapshot.update({ where: { id: snapshotId }, data: { jobStatus: 'PROCESSING' } });

  for (const row of rows) {
    let product = await prisma.product.findFirst({
      where: { OR: [{ sku: row.sku }, { sku: stripZeros(row.sku) }, ...(row.ean ? [{ ean: row.ean }] : [])] },
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

// ─── NFe Import Processor (v2 — full ICMS-ST/FCP-ST extraction) ──────────────
nfeImportQueue.process('process-nfe-items', async (job) => {
  const { documentId } = job.data;
  console.log(`[nfe-import] Processing document ${documentId}`);

  const doc = await prisma.nfeDocument.findUnique({ where: { id: documentId } });
  if (!doc?.rawXml) {
    await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'FAILED', jobError: 'No XML data' } });
    return;
  }

  try {
    await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'PROCESSING' } });

    const parsed = parseNfeXml(doc.rawXml);
    const h = parsed.header;

    await prisma.nfeDocument.update({
      where: { id: documentId },
      data: {
        emitState: h.emitState || undefined,
        destState: h.destState || undefined,
        operationNature: h.operationNature || undefined,
        rawProtocolNumber: h.rawProtocolNumber || undefined,
        rawAdditionalInfo: h.rawAdditionalInfo || undefined,
        xmlHash: parsed.xmlHash,
        parserVersion: h.parserVersion,
      },
    });

    for (const item of parsed.items) {
      const sku = item.cProd;
      const skuNorm = stripZeros(sku);

      let product = await prisma.product.findFirst({
        where: { OR: [{ sku }, { sku: skuNorm }] },
      });
      if (!product && item.cEan) {
        product = await prisma.product.findFirst({ where: { ean: item.cEan } });
      }

      await prisma.nfeItem.create({
        data: {
          nfeDocumentId: documentId,
          productId: product?.id,
          nItem: item.nItem,
          cProd: sku,
          xProd: item.xProd,
          cEan: item.cEan,
          ncm: item.ncm,
          cest: item.cest,
          cfop: item.cfop,
          uCom: item.uCom,
          qCom: item.qCom,
          vUnCom: item.vUnCom,
          vProd: item.vProd,
          extIpi: item.extIpi,
          supplierOrderRef: item.supplierOrderRef,

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

    await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'DONE' } });
    console.log(`[nfe-import] Done: ${documentId}, ${parsed.items.length} items (parser v${getParserVersion()})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[nfe-import] Error processing ${documentId}:`, msg);
    await prisma.nfeDocument.update({ where: { id: documentId }, data: { jobStatus: 'FAILED', jobError: msg } });
  }
});

// ─── Matching Engine with FIFO Real Allocation ──────────────────────────────
matchingQueue.process('run-matching', async (job) => {
  const { snapshotId } = job.data;
  console.log(`[matching] Running matching for snapshot ${snapshotId}`);

  const snapshot = await prisma.stockSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) { console.error(`[matching] Snapshot ${snapshotId} not found`); return; }

  const stockItems = await prisma.stockSnapshotItem.findMany({
    where: { snapshotId },
    include: { productMatches: true, originAllocations: true },
  });

  const nfeItems = await prisma.nfeItem.findMany({
    where: { nfeDocument: { branchId: snapshot.branchId, dataEmissao: { lte: snapshot.referenceDate } } },
    include: { nfeDocument: true },
    orderBy: { nfeDocument: { dataEmissao: 'asc' } },
  });

  // Build remaining quantity map: how much of each NfeItem is still available
  const existingAllocations = await prisma.stockOriginAllocation.findMany({
    where: { nfeItemId: { in: nfeItems.map(ni => ni.id) } },
  });

  const usedQtyMap = new Map<string, number>();
  for (const alloc of existingAllocations) {
    const prev = usedQtyMap.get(alloc.nfeItemId) ?? 0;
    usedQtyMap.set(alloc.nfeItemId, prev + dec(alloc.allocatedQty));
  }

  let matchCount = 0;
  let allocCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const si of stockItems) {
      if (si.productMatches.length > 0 && si.originAllocations.length > 0) continue;

      const stockQty = dec(si.quantity);
      if (stockQty <= 0) continue;

      const siSku = stripZeros(si.rawSku);

      // Find ALL matching NfeItems (not just first)
      const candidates = nfeItems.filter((ni) => {
        if (stripZeros(ni.cProd) === siSku) return true;
        if (si.rawEan && ni.cEan === si.rawEan) return true;
        return false;
      });

      // Fuzzy fallback
      if (candidates.length === 0 && si.rawNcm) {
        const descWords = si.rawDescription.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        for (const ni of nfeItems) {
          if (ni.ncm !== si.rawNcm) continue;
          const match = descWords.some((w) => ni.xProd.toLowerCase().includes(w));
          if (match) candidates.push(ni);
        }
      }

      if (candidates.length === 0) {
        await tx.issue.create({
          data: {
            stockSnapshotItemId: si.id,
            title: 'Item de estoque sem NF-e correspondente',
            description: `SKU: ${si.rawSku} | ${si.rawDescription}`,
            severity: 'HIGH',
            status: 'OPEN',
          },
        });
        continue;
      }

      // Determine match type for first candidate
      const firstCandidate = candidates[0];
      const matchType = stripZeros(firstCandidate.cProd) === siSku
        ? 'EXACT_SKU' as const
        : (si.rawEan && firstCandidate.cEan === si.rawEan)
          ? 'EXACT_EAN' as const
          : 'FUZZY_DESCRIPTION_NCM' as const;

      // FIFO allocation across candidates
      let remainingStockQty = stockQty;

      for (const ni of candidates) {
        if (remainingStockQty <= 0) break;

        const niTotalQty = dec(ni.qCom);
        const alreadyUsed = usedQtyMap.get(ni.id) ?? 0;
        const availableQty = niTotalQty - alreadyUsed;

        if (availableQty <= 0) continue;

        const allocQty = Math.min(remainingStockQty, availableQty);
        const proportion = allocQty / niTotalQty;

        const allocCost = dec(ni.vProd) * proportion;
        const allocIcms = dec(ni.vIcms) * proportion;
        const allocIcmsSt = dec(ni.vICMSST) * proportion;
        const allocFcpSt = dec(ni.vFCPST) * proportion;

        const unitIcms = dec(ni.icmsUnitAmount);
        const unitIcmsSt = dec(ni.icmsStUnitAmount);
        const unitFcpSt = dec(ni.fcpStUnitAmount);

        await tx.stockOriginAllocation.create({
          data: {
            stockSnapshotItemId: si.id,
            nfeItemId: ni.id,
            strategy: 'FIFO',
            allocatedQty: allocQty,
            allocatedCost: allocCost,
            allocatedIcms: allocIcms,
            sourceTaxRegime: ni.taxRegime,
            allocatedRegularIcms: allocIcms,
            allocatedIcmsSt: allocIcmsSt,
            allocatedFcpSt: allocFcpSt,
            unitRegularIcms: unitIcms,
            unitIcmsSt: unitIcmsSt,
            unitFcpSt: unitFcpSt,
          },
        });

        usedQtyMap.set(ni.id, alreadyUsed + allocQty);
        remainingStockQty -= allocQty;
        allocCount++;
      }

      // Create product match for the first candidate
      const confidence = matchType === 'FUZZY_DESCRIPTION_NCM' ? 0.75 : 1.0;
      await tx.productMatch.create({
        data: {
          stockSnapshotItemId: si.id,
          nfeItemId: firstCandidate.id,
          productId: si.productId,
          matchType,
          confidence,
          isConfirmed: matchType !== 'FUZZY_DESCRIPTION_NCM',
        },
      });

      matchCount++;

      // Issue for insufficient allocation
      if (remainingStockQty > 0.0001) {
        await tx.issue.create({
          data: {
            stockSnapshotItemId: si.id,
            title: 'Lastro fiscal insuficiente',
            description: `SKU: ${si.rawSku} | Estoque: ${stockQty} | Alocado: ${(stockQty - remainingStockQty).toFixed(4)} | Faltam: ${remainingStockQty.toFixed(4)}`,
            severity: 'MEDIUM',
            status: 'OPEN',
          },
        });
      }
    }
  });

  console.log(`[matching] Done: ${matchCount} matches, ${allocCount} allocations out of ${stockItems.length} stock items`);
});

// ─── General Calculations Processor ──────────────────────────────────────────
calculationsQueue.process('run-calculation', async (job) => {
  const { calculationId, snapshotId } = job.data;
  console.log(`[calculations] Running calculation ${calculationId}`);

  await prisma.creditCalculation.update({
    where: { id: calculationId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const calc = await prisma.creditCalculation.findUnique({ where: { id: calculationId } });
  if (!calc) return;

  try {
    const whereAlloc = snapshotId
      ? { stockSnapshotItem: { snapshotId } }
      : { stockSnapshotItem: { snapshot: { branchId: calc.branchId } } };

    const allocations = await prisma.stockOriginAllocation.findMany({ where: whereAlloc });

    let totalStockCost = new Prisma.Decimal(0);
    let totalIcmsPaid = new Prisma.Decimal(0);
    let totalIcmsStPaid = new Prisma.Decimal(0);
    let totalFcpStPaid = new Prisma.Decimal(0);

    for (const a of allocations) {
      totalStockCost = totalStockCost.add(a.allocatedCost);
      totalIcmsPaid = totalIcmsPaid.add(a.allocatedIcms);
      totalIcmsStPaid = totalIcmsStPaid.add(a.allocatedIcmsSt);
      totalFcpStPaid = totalFcpStPaid.add(a.allocatedFcpSt);
    }

    const potentialCredit = totalIcmsPaid.add(totalIcmsStPaid).add(totalFcpStPaid);
    const approvedCredit = potentialCredit; // in GENERAL_ICMS mode, all is approved
    const blockedCredit = new Prisma.Decimal(0);

    const whereItems = snapshotId
      ? { snapshotId }
      : { snapshot: { branchId: calc.branchId } };
    const totalItems = await prisma.stockSnapshotItem.count({ where: whereItems });
    const matchedItems = await prisma.productMatch.count({
      where: { isConfirmed: true, stockSnapshotItem: whereItems },
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
        totalIcmsStCredit: totalIcmsStPaid,
        totalFcpStCredit: totalFcpStPaid,
        finishedAt: new Date(),
      },
    });

    console.log(`[calculations] Done: ${calculationId}, potential: ${potentialCredit.toFixed(2)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.creditCalculation.update({
      where: { id: calculationId },
      data: { status: 'ERROR', jobError: msg, finishedAt: new Date() },
    });
    console.error(`[calculations] Error: ${calculationId}`, msg);
  }
});

// ─── ST Transition Calculation Processor ─────────────────────────────────────
transitionCalcQueue.process('run-transition-calculation', async (job) => {
  const { calculationId } = job.data;
  console.log(`[transition-calc] Running ST transition calculation ${calculationId}`);

  const calc = await prisma.creditCalculation.findUnique({
    where: { id: calculationId },
    include: { transitionRule: true },
  });
  if (!calc || !calc.transitionRule || !calc.transitionRuleId) {
    console.error(`[transition-calc] Calculation ${calculationId} not found or missing rule`);
    return;
  }

  try {
    await prisma.creditCalculation.update({
      where: { id: calculationId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const rule = calc.transitionRule;
    const version = (calc.executionVersion ?? 0) + 1;

    // Idempotency: delete only auto-generated records from previous versions
    await prisma.$transaction(async (tx) => {
      // Delete auto-generated ledger entries (preserve manual adjustments/blocks)
      await tx.transitionCreditLedgerEntry.deleteMany({
        where: { transitionCreditLot: { calculationId }, isAutoGenerated: true },
      });

      // Delete credit lots from previous auto runs (preserve manually adjusted ones)
      await tx.transitionCreditLot.deleteMany({
        where: { calculationId, status: { in: ['OPEN', 'PARTIALLY_USED'] } },
      });
    });

    // Load allocations for this branch's snapshots that have ST
    const snapshotFilter = calc.transitionReferenceDate
      ? { branchId: calc.branchId, referenceDate: { lte: calc.transitionReferenceDate } }
      : { branchId: calc.branchId };

    const snapshots = await prisma.stockSnapshot.findMany({
      where: snapshotFilter,
      orderBy: { referenceDate: 'desc' },
      take: 1,
    });

    if (snapshots.length === 0) {
      await prisma.creditCalculation.update({
        where: { id: calculationId },
        data: { status: 'ERROR', jobError: 'Nenhum snapshot de estoque encontrado', finishedAt: new Date() },
      });
      return;
    }

    const snapshot = snapshots[0];

    const allocations = await prisma.stockOriginAllocation.findMany({
      where: {
        stockSnapshotItem: { snapshotId: snapshot.id },
        sourceTaxRegime: 'ST',
      },
      include: {
        stockSnapshotItem: true,
        nfeItem: { include: { nfeDocument: true } },
      },
    });

    let totalIcmsStCredit = new Prisma.Decimal(0);
    let totalFcpStCredit = new Prisma.Decimal(0);
    let totalCreditGenerated = new Prisma.Decimal(0);
    let totalCreditBlocked = new Prisma.Decimal(0);
    let lotsCreated = 0;

    await prisma.$transaction(async (tx) => {
      for (const alloc of allocations) {
        const si = alloc.stockSnapshotItem;
        const ni = alloc.nfeItem;

        // Check rule filters — create Issues for skipped items
        if (rule.ncmRange && ni.ncm) {
          const [from, to] = rule.ncmRange.split('-').map(s => s.trim());
          if (ni.ncm < from || (to && ni.ncm > to)) {
            await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'NCM fora da faixa da regra de transição', description: `SKU: ${si.rawSku} | NCM ${ni.ncm} fora da faixa ${rule.ncmRange} | Regra: ${rule.name}`, severity: 'LOW', status: 'OPEN' } });
            continue;
          }
        }
        if (rule.cfopList && ni.cfop) {
          const cfops = rule.cfopList.split(',').map(s => s.trim());
          if (!cfops.includes(ni.cfop)) {
            await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'CFOP incompatível com a regra de transição', description: `SKU: ${si.rawSku} | CFOP ${ni.cfop} não está na lista ${rule.cfopList} | Regra: ${rule.name}`, severity: 'LOW', status: 'OPEN' } });
            continue;
          }
        }
        if (rule.cstList && ni.cst) {
          const csts = rule.cstList.split(',').map(s => s.trim());
          if (!csts.includes(ni.cst)) {
            await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'CST incompatível com a regra de transição', description: `SKU: ${si.rawSku} | CST ${ni.cst} não está na lista ${rule.cstList} | Regra: ${rule.name}`, severity: 'LOW', status: 'OPEN' } });
            continue;
          }
        }
        if (rule.cestList && ni.cest) {
          const cests = rule.cestList.split(',').map(s => s.trim());
          if (!cests.includes(ni.cest)) {
            await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'CEST incompatível com a regra de transição', description: `SKU: ${si.rawSku} | CEST ${ni.cest} não está na lista ${rule.cestList} | Regra: ${rule.name}`, severity: 'LOW', status: 'OPEN' } });
            continue;
          }
        }
        if (rule.stateFrom && ni.nfeDocument?.emitState && ni.nfeDocument.emitState !== rule.stateFrom) {
          await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'NF-e de UF incorreta para a regra de transição', description: `SKU: ${si.rawSku} | UF emitente: ${ni.nfeDocument.emitState} | Esperada: ${rule.stateFrom} | Regra: ${rule.name}`, severity: 'MEDIUM', status: 'OPEN' } });
          continue;
        }

        // Check if item has necessary ST data
        if (dec(ni.vICMSST) === 0 && ni.stApplies) {
          await tx.issue.create({ data: { stockSnapshotItemId: si.id, title: 'Item sem dados de ICMS-ST suficientes', description: `SKU: ${si.rawSku} | Item marcado como ST mas vICMSST = 0 | NF-e ${ni.nfeDocument?.numero}`, severity: 'HIGH', status: 'OPEN' } });
        }

        const allocQty = dec(alloc.allocatedQty);
        const unitSt = dec(alloc.unitIcmsSt);
        const unitFcp = dec(alloc.unitFcpSt);

        const lotIcmsSt = allocQty * unitSt;
        const lotFcpSt = allocQty * unitFcp;

        let creditableAmount: number;
        let nonCreditableAmount = 0;

        switch (rule.calcMethod) {
          case 'PROPORTIONAL_ST_ONLY':
            creditableAmount = lotIcmsSt;
            nonCreditableAmount = lotFcpSt;
            break;
          case 'PROPORTIONAL_ST_PLUS_FCP':
            creditableAmount = lotIcmsSt + lotFcpSt;
            break;
          case 'MANUAL_OVERRIDE':
            creditableAmount = 0;
            nonCreditableAmount = lotIcmsSt + lotFcpSt;
            break;
          default:
            creditableAmount = lotIcmsSt;
            nonCreditableAmount = lotFcpSt;
        }

        const lot = await tx.transitionCreditLot.create({
          data: {
            branchId: calc.branchId,
            calculationId,
            snapshotId: snapshot.id,
            stockSnapshotItemId: si.id,
            nfeItemId: ni.id,
            taxTransitionRuleId: rule.id,
            quantityInStock: dec(si.quantity),
            quantityAllocatedFromNfe: allocQty,
            unitIcmsSt: unitSt,
            unitFcpSt: unitFcp,
            totalIcmsSt: lotIcmsSt,
            totalFcpSt: lotFcpSt,
            creditableAmount,
            nonCreditableAmount,
            status: creditableAmount > 0 ? 'OPEN' : 'BLOCKED',
            rationale: `Método: ${rule.calcMethod} | Regra: ${rule.name}`,
            executionVersion: version,
          },
        });

        // Ledger entry
        if (creditableAmount > 0) {
          await tx.transitionCreditLedgerEntry.create({
            data: {
              branchId: calc.branchId,
              transitionCreditLotId: lot.id,
              entryType: 'GENERATED',
              amount: creditableAmount,
              referenceType: 'CALCULATION',
              referenceId: calculationId,
              notes: `Crédito gerado: ${allocQty.toFixed(4)} un x R$${unitSt.toFixed(4)}/un ST`,
              executionVersion: version,
              isAutoGenerated: true,
            },
          });

          totalIcmsStCredit = totalIcmsStCredit.add(new Prisma.Decimal(lotIcmsSt));
          totalFcpStCredit = totalFcpStCredit.add(new Prisma.Decimal(lotFcpSt));
          totalCreditGenerated = totalCreditGenerated.add(new Prisma.Decimal(creditableAmount));
        } else {
          totalCreditBlocked = totalCreditBlocked.add(new Prisma.Decimal(lotIcmsSt + lotFcpSt));
        }

        lotsCreated++;
      }
    });

    await prisma.creditCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'DONE',
        totalIcmsStCredit,
        totalFcpStCredit,
        totalTransitionCreditGenerated: totalCreditGenerated,
        totalTransitionCreditBlocked: totalCreditBlocked,
        totalTransitionCreditAvailable: totalCreditGenerated,
        potentialCredit: totalCreditGenerated.add(totalCreditBlocked),
        approvedCredit: totalCreditGenerated,
        blockedCredit: totalCreditBlocked,
        executionVersion: version,
        finishedAt: new Date(),
      },
    });

    console.log(`[transition-calc] Done: ${calculationId}, ${lotsCreated} lots, credit: ${totalCreditGenerated.toFixed(2)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.creditCalculation.update({
      where: { id: calculationId },
      data: { status: 'ERROR', jobError: msg, finishedAt: new Date() },
    });
    console.error(`[transition-calc] Error: ${calculationId}`, msg);
  }
});

// ─── Dossier Generator ───────────────────────────────────────────────────────
dossiersQueue.process('generate-dossier', async (job) => {
  const { dossierId } = job.data;
  console.log(`[dossiers] Generating dossier ${dossierId}`);

  await prisma.dossier.update({
    where: { id: dossierId },
    data: { status: 'PENDING_REVIEW' },
  });

  console.log(`[dossiers] Done: ${dossierId}`);
});

// ─── Error handlers ───────────────────────────────────────────────────────────
[stockImportQueue, nfeImportQueue, matchingQueue, calculationsQueue, transitionCalcQueue, dossiersQueue].forEach((q) => {
  q.on('failed', (job, err) => {
    console.error(`[${q.name}] Job ${job.id} failed:`, err.message);
  });
  q.on('completed', (job) => {
    console.log(`[${q.name}] Job ${job.id} completed`);
  });
});

console.log('🔧 Lastro Worker started — listening for jobs...');
