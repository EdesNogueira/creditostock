const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearMockData() {
  console.log('Limpando dados mockados...');

  const r = {};
  r.auditLogs = (await prisma.auditLog.deleteMany({})).count;
  r.dossiers = (await prisma.dossier.deleteMany({})).count;
  r.calculations = (await prisma.creditCalculation.deleteMany({})).count;
  r.issues = (await prisma.issue.deleteMany({})).count;
  r.allocations = (await prisma.stockOriginAllocation.deleteMany({})).count;
  r.matches = (await prisma.productMatch.deleteMany({})).count;
  r.snapshotItems = (await prisma.stockSnapshotItem.deleteMany({})).count;
  r.snapshots = (await prisma.stockSnapshot.deleteMany({})).count;
  r.nfeItems = (await prisma.nfeItem.deleteMany({})).count;
  r.nfeDocs = (await prisma.nfeDocument.deleteMany({})).count;
  r.aliases = (await prisma.productAlias.deleteMany({})).count;
  r.products = (await prisma.product.deleteMany({})).count;
  r.taxRules = (await prisma.taxRule.deleteMany({})).count;

  console.log('Removidos:', JSON.stringify(r, null, 2));
  console.log('\nDados mockados limpos com sucesso!');
  console.log('Empresa demo e filiais foram mantidas.');
  await prisma.$disconnect();
}

clearMockData().catch(e => { console.error(e); process.exit(1); });
